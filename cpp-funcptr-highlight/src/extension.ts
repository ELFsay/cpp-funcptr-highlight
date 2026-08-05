import * as vscode from 'vscode';
import { CFunctionPointerTokensProvider, legend } from './semanticProvider';

// 匹配 obj.func(...) / ptr->func(...)，成员名后紧跟 '('，中间允许空格
// 用字面正则（而非字符串构造 new RegExp），彻底避免字符串转义导致正则被破坏。
const CALL_RE = /(?:\.|->)[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;
const DEFAULT_COLOR = '#DCDCAA'; // Dark+ 主题函数金黄色

function isTarget(langId: string): boolean {
  return langId === 'c' || langId === 'cpp';
}

/**
 * 主方案：装饰器（Decoration）。
 * 装饰器渲染在语义 Token / TextMate 之上，可确定性覆盖函数名为金黄色，
 * 且完全不触碰 IntelliSense 的任何语义结果（宏/类型/枚举高亮不受影响）。
 */
class FunctionPointerDecorator {
  private decoration: vscode.TextEditorDecorationType;
  private updateTimer: ReturnType<typeof setTimeout> | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    this.decoration = this.createDecoration();

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

    // 手动刷新命令，便于验证/调试
    context.subscriptions.push(
      vscode.commands.registerCommand('cppFuncPtr.refresh', () => this.updateAll())
    );

    this.scheduleUpdate();
  }

  private createDecoration(): vscode.TextEditorDecorationType {
    const color = vscode.workspace.getConfiguration('cppFuncPtr').get<string>('highlightColor', DEFAULT_COLOR);
    return vscode.window.createTextEditorDecorationType({ color });
  }

  private rebuild(): void {
    // 颜色在创建时固定，配置变更时需重建装饰器
    this.decoration.dispose();
    this.decoration = this.createDecoration();
    this.context.subscriptions.push(this.decoration);
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
      editor.setDecorations(this.decoration, []);
      return;
    }
    const document = editor.document;
    const text = document.getText();
    const codeMask = buildCodeMask(text); // 1=代码区, 0=注释/字符串
    const ranges: vscode.Range[] = [];
    CALL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CALL_RE.exec(text)) !== null) {
      const name = m[1];
      const startOffset = m.index + m[0].indexOf(name);
      if (codeMask[startOffset] === 1) {
        const start = document.positionAt(startOffset);
        const end = document.positionAt(startOffset + name.length);
        ranges.push(new vscode.Range(start, end));
      }
    }
    editor.setDecorations(this.decoration, ranges);
    // 诊断日志：查看 输出 -> 扩展主机 可确认插件是否工作及匹配数
    console.log(`[cpp-funcptr-highlight] ${document.uri.fsPath}: matched ${ranges.length} call(s)`);
  }
}

/**
 * 逐字符扫描，标记每个偏移量是否位于代码区（1=代码区，0=注释/字符串内部），
 * 避免把注释/字符串里的相似文本误高亮。
 */
function buildCodeMask(text: string): Uint8Array {
  const n = text.length;
  const mask = new Uint8Array(n); // 默认 0
  let i = 0;
  let inLine = false;  // 行注释 //
  let inBlock = false; // 块注释
  let inStr = false;   // 双引号字符串
  let inChar = false;  // 字符字面量
  while (i < n) {
    const ch = text[i];
    const next = text[i + 1];
    if (!inLine && !inBlock && !inStr && !inChar) {
      // 代码区：计入，并识别进入注释/字符串的起点
      if (ch === '"') { inStr = true; mask[i] = 1; i++; continue; }
      if (ch === "'") { inChar = true; mask[i] = 1; i++; continue; }
      if (ch === '/' && next === '/') { inLine = true; mask[i] = 1; mask[i + 1] = 1; i += 2; continue; }
      if (ch === '/' && next === '*') { inBlock = true; mask[i] = 1; mask[i + 1] = 1; i += 2; continue; }
      mask[i] = 1; i++; continue;
    }
    // 注释/字符串内部：保持 0（不参与高亮），仅处理转义与结束
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
    // inBlock
    if (ch === '*' && next === '/') { i += 2; inBlock = false; continue; }
    i++;
  }
  return mask;
}

export function activate(context: vscode.ExtensionContext): void {
  // 主方案：装饰器
  new FunctionPointerDecorator(context);

  // 可选：语义 Token Provider（默认关闭，见设置 cppFuncPtr.enableSemanticTokens）
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
  // decoration 等已通过 context.subscriptions 自动 dispose
}
