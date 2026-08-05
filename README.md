# C/C++ Function Pointer Highlight
本插件完全使用cline+deepseek v4 flash开发

解决 VS Code + 微软 C/C++ 扩展下，**结构体函数指针调用**无法显示为函数金黄色（`#DCDCAA`）而被渲染成普通变量色的问题。

满足：
- `obj.func(...)` / `ptr->func(...)` → `func` 显示为金黄色（函数色）。
- `obj.field` / `ptr->field`（不带括号）→ 保持默认变量色，不受影响。
- 宏（`#define`）、类型（`typedef`）、枚举等原生 IntelliSense 语义高亮完全不受影响。

## 为什么不用 Semantic Tokens Provider

VS Code 对**同一文档只采用一个 Semantic Tokens Provider**（语言特性注册中按 selector 命中第一个即生效）。
- 若 IntelliSense（cpptools）先注册，第三方 Provider 不会被调用；
- 若第三方先注册，则会顶掉 IntelliSense 的全部语义高亮（宏/类型/枚举失效）。

因此“再注册一个 Provider 把 `function` 叠加到 IntelliSense 之上”无法成立。本插件改用 **TextEditorDecoration（装饰器）**，它渲染在语义 Token / TextMate 之上，能确定性覆盖函数名为金黄色，同时完全不触碰 IntelliSense。

> 代码中仍保留了 `DocumentSemanticTokensProvider` 实现（`src/semanticProvider.ts`），默认关闭（`cppFuncPtr.enableSemanticTokens=false`），仅供实验。

## 构建与打包

```powershell
cd c:\Users\shengjiaxuan\Desktop\cvscode\cpp-funcptr-highlight
npm install          # 下载 typescript / @vscode/vsce 等依赖
npm run compile      # tsc -> out/extension.js
npx @vscode/vsce package   # 生成 .vsix 安装包
```

安装：`code --install-extension cpp-funcptr-highlight-1.3.1.vsix` 或在 VS Code 中 `扩展 -> ... -> 从 VSIX 安装...`。

## 设置项

| 设置 | 默认 | 说明 |
| --- | --- | --- |
| `cppFuncPtr.highlightColor` | `#DCDCAA` | 结构体成员函数指针调用的高亮颜色（Dark+ 函数金黄色） |
| `cppFuncPtr.standaloneColor` | `#DCDCAA` | 独立函数指针变量调用 (fp(...)) 的高亮颜色，可单独设置 |
| `cppFuncPtr.highlightMemberCalls` | `true` | 结构体成员函数指针调用 (obj.func(...) / ptr->func(...)) 是否金色 |
| `cppFuncPtr.highlightStandaloneFnPtr` | `false` | 独立声明的函数指针变量调用 (fp(...)) 是否金色（注意会覆盖普通函数/宏调用色） |
| `cppFuncPtr.enableSemanticTokens` | `false` | 是否注册语义 Token Provider（可能与 IntelliSense 互斥） |

## 测试

打开 `src/test/sample.c`，观察 `angle_read(...)` 为金黄色、`port.angle`/`io.speed`/`id` 保持默认色、宏/注释/字符串内文本不被误标。

## ⚠️ 一个必须说明的语法局限

开启 `highlightStandaloneFnPtr` 后，__普通函数调用也会被命中__（如 `void fn(...)` 的 `fn`）。因为纯文本里 `fn(` 和函数指针 `fp(` 无法区分——要区分必须拿到符号表（cpptools 语义），而那会与 IntelliSense 互斥，不可行。__当 `standaloneColor` 保持默认金色 `#DCDCAA` 时无任何视觉影响__（普通函数本来就是金色）；若你把 `standaloneColor` 设成别的颜色，普通函数调用也会跟着变色。请知悉这一点再决定是否开启。




