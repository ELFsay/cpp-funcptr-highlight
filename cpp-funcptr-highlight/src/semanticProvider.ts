import * as vscode from 'vscode';

// 语义 Token 类型表：仅定义 'function'（索引 0）
export const tokenTypes = ['function'];
export const tokenModifiers: string[] = [];
export const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

// 匹配 obj.func(...) 或 ptr->func(...)，成员名后必须紧跟 '('
const CALL_RE = /(?:\.|->)[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/g;

/**
 * 语义 Token Provider。
 * 注意：VS Code 对同一文档只采用一个语义 Token Provider，本实现与 IntelliSense 存在互斥，
 * 因此默认不注册（见 extension.ts 中的设置开关 cppFuncPtr.enableSemanticTokens）。
 */
export class CFunctionPointerTokensProvider implements vscode.DocumentSemanticTokensProvider {
  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    const builder = new vscode.SemanticTokensBuilder(legend);
    const text = document.getText();
    const re = new RegExp(CALL_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = m[1];
      const startOffset = m.index + m[0].indexOf(name);
      const startPos = document.positionAt(startOffset);
      builder.push(startPos.line, startPos.character, name.length, 0 /* function */, 0 /* 无 modifier */);
    }
    return builder.build();
  }
}
