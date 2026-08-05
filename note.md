下面为你整理好一份**清晰、专业且可直接复制交给 AI 智能体（Agent）执行的需求文档**。

---

# 需求任务：开发 VS Code 插件解决 C/C++ 结构体函数指针语义高亮冲突

## 一、 问题背景与痛点 (Problem)

在 VS Code 中使用微软原生 C/C++ 扩展（IntelliSense，`C_Cpp.enhancedColorization: "enabled"`）时，**结构体中的函数指针调用**（例如 `axis->io.port.angle_read(...)`）无法高亮为代表函数的金黄色（`#DCDCAA`），而是被渲染为普通变量的蓝色/青色（`#9CDCFE` / `#4EC9B0`）。

### 底层根本原因：

1. **IntelliSense 引擎局限**：微软 C/C++ 扩展在 AST 层面将所有结构体成员（无论是否为函数指针）一律标记为 **`property`** 语义 Token（Semantic Token）。
2. **高亮层级覆盖**：VS Code 的 **Semantic Token 优先级高于 TextMate 正则高亮**。即使 TextMate 正则已经精准识别出 `entity.name.function.member`（函数成员），IntelliSense 强制抛出的 `property` 标记依然会盖掉 TextMate 的金黄色。
3. **设置死锁**：若通过 `settings.json` 设置 `"property": { "tokenColors": false }` 屏蔽 `property` 语义，IntelliSense 会触发 Fallback 机制读取 `variable` 的颜色，导致结构体函数指针依然无法与普通成员区分；若全局禁用 `enhancedColorization`，又会导致宏定义（`#define`）、类型（`typedef`）等其他语义高亮全部失效。

---

## 二、 预期功能与终极目标 (Expected Behavior)

开发一个轻量的 VS Code 自定义插件，在不破坏原生 IntelliSense 任何既有语义高亮（如宏、类型、枚举等）的前提下，精准修复结构体函数指针的高亮展示：

1. **结构体函数指针调用高亮**：
* 代码形式：`object.func_ptr(...)` 或 `pointer->func_ptr(...)`
* 预期外观：`func_ptr` 必须呈现为**金黄色（`#DCDCAA` 或当前主题的函数高亮色）**。


2. **普通结构体数据成员不受影响**：
* 代码形式：`object.field` 或 `pointer->field`（后面不跟括号 `(`）
* 预期外观：保持默认的**变量青色/天蓝色（`#4EC9B0` / `#9CDCFE`）**。


3. **与原生 IntelliSense 兼容**：
* 宏定义（`#define`）、类型（`typedef`）、枚举值、全局/局部变量的语义高亮正常工作，无需修改或关闭 `C_Cpp.enhancedColorization`。



---

## 三、 智能体 (Agent) 开发路线与技术实现指南

请智能体按照以下步骤完成插件开发与打包：

### 1. 技术方案选型

注册一个 `vscode.DocumentSemanticTokensProvider`，针对 C/C++（`c` / `cpp`）语言文件，在语义解析层注入高优先级的 `function` Token。

### 2. 核心逻辑要求

* **正则匹配模式**：匹配 `/(?:\.|->)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g`。
* **位置定位与计算**：精准获取匹配到的成员函数名在文档中的起始 Line、Character 与 Length。
* **Semantic Token 抛出**：构建 `vscode.SemanticTokensBuilder`，将匹配到的 Token 类型指定为 `function`（索引为 0）。

### 3. 核心代码参考 (`src/extension.ts`)

```typescript
import * as vscode from 'vscode';

const tokenTypes = ['function'];
const tokenModifiers = ['callable'];
const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

class CFunctionPointerTokensProvider implements vscode.DocumentSemanticTokensProvider {
    async provideDocumentSemanticTokens(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.SemanticTokens> {
        const builder = new vscode.SemanticTokensBuilder(legend);
        const text = document.getText();

        // 正则匹配：结构体通过 . 或 -> 调用且紧跟 ( 的成员名
        const regex = /(?:\.|->)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
            const memberName = match[1];
            const startOffset = match.index + match[0].indexOf(memberName);
            const startPos = document.positionAt(startOffset);

            builder.push(
                startPos.line,
                startPos.character,
                memberName.length,
                0, // TokenType: 'function'
                0  // Modifiers
            );
        }

        return builder.build();
    }
}

export function activate(context: vscode.ExtensionContext) {
    const selector: vscode.DocumentSelector = [
        { language: 'c', scheme: 'file' },
        { language: 'cpp', scheme: 'file' }
    ];

    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(
            selector,
            new CFunctionPointerTokensProvider(),
            legend
        )
    );
}

export function deactivate() {}

```

### 4. 交付物要求

1. **完整插件源码**：包含正确的 `package.json`（配置 `contributes.semanticTokenScopes` 等）、`src/extension.ts`、`tsconfig.json`。
2. **编译并打包的安装包**：使用 `@vscode/vsce` 打包生成的 `.vsix` 文件，方便通过 VS Code `Install from VSIX...` 直接安装使用。