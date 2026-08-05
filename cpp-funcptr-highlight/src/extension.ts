import * as vscode from 'vscode';
import { CFunctionPointerTokensProvider, legend } from './semanticProvider';

// 成员函数指针调用：obj.func(...) / ptr->func(...)
const CALL_RE = /(?:\.|->)[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;
// 独立函数指针变量调用点：fp(...)（前面不是标识符字符/点/横线，避免误匹配成员调用）
const STANDALONE_CALL_RE = /(?<![A-Za-z0-9_.\-])([A-Za-z_][A-Za-z0-9_]*)[ \t]*\((?![ \t]*\*)/g;
// 函数指针声明 / 解引用调用：(*名字)(...)
// 用固定结构 (*name)( 匹配，与返回类型无关（void 或自定义类型都能识别），也不会误标返回类型
const STANDALONE_DECL_RE = /(?<=\(\s*\*\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*\(/g;

// 调用点名字( 排除控制流关键字与基本类型，避免 if( / void( / int(x) 等被误当函数指针调用
// 注意：声明识别已改用 (*name)( 结构，不依赖类型排除，因此自定义返回类型也能正确识别。
const KEYWORDS = new Set([
  'if','for','while','do','switch','case','default','return','goto','sizeof','typeof','alignof',
  'decltype','new','delete','catch','try','throw','else','defined',
  'void','_Bool','bool','char','wchar_t','char16_t','char32_t','short','int','long','float','double',
  'signed','unsigned','auto'
]);

const DEFAULT_COLOR = '#DCDCAA'; // Dark+ 主题函数金黄色

function isTarget(langId: string): boolean {
  return langId === 'c' || langId === 'cpp';
}

/**
 * 主方案：装饰器（Decoration）。
 * 装饰器渲染在语义 Token / TextMate 之上，可确定性覆盖函数名为金黄色，
 * 且完全不触碰 IntelliSense 的任何语义结果（宏/类型/枚举高亮不受影响）。
 * 使用两个独立装饰器：成员调用与独立函数指针可分别配色。
 */
class FunctionPointerDecorator {
  private memberDecoration: vscode.TextEditorDecorationType;
  private standaloneDecoration: vscode.TextEditorDecorationType;
  private updateTimer: ReturnType<typeof setTimeout> | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    this.memberDecoration = this.createDecoration('highlightColor', DEFAULT_COLOR);
    this.standaloneDecoration = this.createDecoration('standaloneColor', DEFAULT_COLOR);

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.scheduleUpdate()),
      vscode.window.onDidChangeVisibleTextEditors(() => this.scheduleUpdate()),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (isTarget(e.document.languageId) &&
            vscode.window.visibleTextEditors.some((ed) => ed.document === e.document)) {
          this.scheduleUpdate();
        }
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('cppFuncPtr')) this.rebuild();
      })
    );
    context.subscriptions.push(...this.disposables);

    context.subscriptions.push(
      vscode.commands.registerCommand('cppFuncPtr.refresh', () => this.updateAll())
    );

    this.scheduleUpdate();
  }

  private createDecoration(setting: string, fallback: string): vscode.TextEditorDecorationType {
    const color = vscode.workspace.getConfiguration('cppFuncPtr').get<string>(setting, fallback);
    return vscode.window.createTextEditorDecorationType({ color });
  }

  private rebuild(): void {
    this.memberDecoration.dispose();
    this.standaloneDecoration.dispose();
    this.memberDecoration = this.createDecoration('highlightColor', DEFAULT_COLOR);
    this.standaloneDecoration = this.createDecoration('standaloneColor', DEFAULT_COLOR);
    this.context.subscriptions.push(this.memberDecoration, this.standaloneDecoration);
    this.scheduleUpdate();
  }

  private scheduleUpdate(): void {
    if (this.updateTimer) clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => this.updateAll(), 200);
  }

  private updateAll(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateEditor(editor);
    }
  }

  private updateEditor(editor: vscode.TextEditor): void {
    if (!isTarget(editor.document.languageId)) {
      editor.setDecorations(this.memberDecoration, []);
      editor.setDecorations(this.standaloneDecoration, []);
      return;
    }
    const document = editor.document;
    const text = document.getText();
    const codeMask = buildCodeMask(text);
    const cfg = vscode.workspace.getConfiguration('cppFuncPtr');
    const memberRanges: vscode.Range[] = [];
    const standaloneRanges: vscode.Range[] = [];

    const collect = (re: RegExp, filter: (name: string) => boolean, out: vscode.Range[]): void => {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const name = m[1];
        const startOffset = m.index + m[0].indexOf(name);
        if (codeMask[startOffset] === 1 && filter(name)) {
          const start = document.positionAt(startOffset);
          const end = document.positionAt(startOffset + name.length);
          out.push(new vscode.Range(start, end));
        }
      }
    };

    // 设置一：结构体成员函数指针调用（颜色 = highlightColor）
    if (cfg.get<boolean>('highlightMemberCalls', true)) {
      collect(CALL_RE, () => true, memberRanges);
    }
    // 设置二：独立函数指针变量调用 + 声明（颜色 = standaloneColor）
    if (cfg.get<boolean>('highlightStandaloneFnPtr', false)) {
      collect(STANDALONE_CALL_RE, (name) => !KEYWORDS.has(name), standaloneRanges); // 调用点 fp(...)
      collect(STANDALONE_DECL_RE, () => true, standaloneRanges);                    // 声明/解引用 (*fp)(...)
    }

    editor.setDecorations(this.memberDecoration, memberRanges);
    editor.setDecorations(this.standaloneDecoration, standaloneRanges);
    console.log(`[cpp-funcptr-highlight] ${document.uri.fsPath}: member=${memberRanges.length} standalone=${standaloneRanges.length}`);
  }
}

/**
 * 逐字符扫描，标记每个偏移量是否位于代码区（1=代码区，0=注释/字符串内部）。
 */
function buildCodeMask(text: string): Uint8Array {
  const n = text.length;
  const mask = new Uint8Array(n);
  let i = 0;
  let inLine = false;
  let inBlock = false;
  let inStr = false;
  let inChar = false;
  while (i < n) {
    const ch = text[i];
    const next = text[i + 1];
    if (!inLine && !inBlock && !inStr && !inChar) {
      if (ch === '"') { inStr = true; mask[i] = 1; i++; continue; }
      if (ch === "'") { inChar = true; mask[i] = 1; i++; continue; }
      if (ch === '/' && next === '/') { inLine = true; mask[i] = 1; mask[i + 1] = 1; i += 2; continue; }
      if (ch === '/' && next === '*') { inBlock = true; mask[i] = 1; mask[i + 1] = 1; i += 2; continue; }
      mask[i] = 1; i++; continue;
    }
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === '"') inStr = false;
      i++; continue;
    }
    if (inChar) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === "'") inChar = false;
      i++; continue;
    }
    if (inLine) {
      if (ch === '\n') inLine = false;
      i++; continue;
    }
    if (ch === '*' && next === '/') { i += 2; inBlock = false; continue; }
    i++;
  }
  return mask;
}

export function activate(context: vscode.ExtensionContext): void {
  new FunctionPointerDecorator(context);

  if (vscode.workspace.getConfiguration('cppFuncPtr').get<boolean>('enableSemanticTokens', false)) {
    const selector: vscode.DocumentSelector = [
      { language: 'c', scheme: 'file' },
      { language: 'cpp', scheme: 'file' }
    ];
    context.subscriptions.push(
      vscode.languages.registerDocumentSemanticTokensProvider(selector, new CFunctionPointerTokensProvider(), legend)
    );
  }
}

export function deactivate(): void {
}

