# AGENT.md

本文件是 `vscode-btns`（Custom Actions Panel）项目的协作说明，适用于后续开发者和编码代理。

## 项目概览

这是一个 TypeScript 编写的 VS Code 扩展，在 Activity Bar 中提供“快捷动作”面板。用户通过标准设置项 `customActions.items` 配置动作，支持：

- `command`：执行 VS Code 命令；
- `terminal`：创建或复用终端并执行命令；
- `url`：使用系统默认浏览器打开 URL。

配置面板是 Webview，但配置数据必须继续保持与 `settings.json` 兼容。不要把配置迁移到私有文件、隐藏存储或仅 Webview 可读的格式。

## 技术栈与目录

- Node.js + TypeScript，模块目标和编译入口由 `tsconfig.json` 管理。
- VS Code Extension API（当前引擎版本见 `package.json` 的 `engines.vscode`）。
- Yarn 是本项目唯一约定的包管理器和脚本入口。
- `src/extension.ts`：扩展激活、命令注册和生命周期入口。
- `src/tree/`：Activity Bar TreeView、分组节点、空状态和错误状态。
- `src/config.ts`：读取、检查和写入 `customActions.items`，并选择用户/工作区配置作用域。
- `src/configPanel.ts`：可视化配置 Webview；保存前必须调用统一校验。
- `src/actions.ts`：动作执行、终端复用和停用时的资源清理。
- `src/validation.ts`：配置结构、字段类型、重复 ID 和 URL 协议校验。
- `src/variables.ts`、`src/variableResolver.ts`：动作字符串中的 VS Code/环境变量解析。
- `src/commandMetadata.ts`：命令 ID 与扩展清单本地化标题的关联及命令搜索项构建。
- `src/types.ts`：动作联合类型和校验错误类型。
- `tests/`：命令元数据、配置校验、变量解析的单元测试。
- `resources/`：扩展图标、Codicon 字体和图标清单。

## 开发与验证

首次准备环境：

```bash
yarn install
```

常用命令：

```bash
yarn lint       # ESLint 检查 src 和 tests
yarn test       # 运行 tests/*.test.ts
yarn compile    # TypeScript 编译到 out/
yarn validate   # lint + test + compile
yarn build      # 编译并生成 dist/*.vsix
```

提交前至少运行 `yarn validate`、`yarn build` 和 `git diff --check`。若只修改文档，可按变更风险缩减验证，但应说明未运行的检查。调试扩展使用 VS Code 的 `F5`，在 Extension Development Host 中验证 TreeView、命令、Webview 和终端行为。

## 关键行为约束

### 配置数据

- `customActions.items` 必须是数组；每项至少有非空字符串 `id`、`label` 和 `action`。
- `id` 必须唯一。动作类型只能是 `command`、`terminal` 或 `url`。
- `terminal` 支持 `cwd`、`terminalName`、`reuse`、`reveal`；默认工作目录为当前工作区根目录，默认复用并显示终端。
- `url` 必须包含有效协议和地址；变量占位符可以出现在字符串中。
- 读取配置时保留现有 JSON 形状；编辑器保存时使用 VS Code 的用户/工作区配置作用域，不要覆盖另一作用域的值。
- 新增字段时同步更新 `package.json` 的 configuration schema、`src/types.ts`、校验逻辑、Webview 编辑器和 README（若属于用户可见配置）。

### 面板与命令搜索

- TreeView 顶部固定显示“搜索 VS Code 命令...”入口。它不是用户配置项，不可删除、排序或隐藏。
- 命令搜索项必须显示两行信息：`命令：CMD ID` 和 `描述：本地化标题`；不显示快捷键。
- 没有公开本地化标题的内部命令，描述使用命令 ID 作为回退值。
- 修改中文用户界面时，Profile 一律翻译为“配置”（如“配置列表”“创建配置”）。
- 配置 Webview 保存前和执行动作前都要走 `validateAllItems`；无效项应显示具体字段错误，不能静默执行。

### 生命周期与安全

- 终端复用缓存必须在终端关闭时移除，并在 `deactivate` 中通过 `cleanupTerminals()` 清理监听器和缓存。
- 执行动作必须响应用户操作；不要自动执行配置中的终端命令或远程 URL。
- Webview 继续使用 nonce、严格的 Content Security Policy 和 `acquireVsCodeApi()` 消息通道；不要为方便调试而放宽 CSP。
- 外部输入（配置、Webview 消息、命令元数据）按 `unknown` 处理并校验，不要直接信任类型断言。

## 修改策略

1. 先定位对应模块和现有测试，优先复用既有校验、变量解析和配置读写函数。
2. 修改配置契约时，保证 schema、运行时类型、校验、编辑器和测试同步更新。
3. 修改 Webview 时同时检查深色/浅色主题、窄窗口布局、键盘可操作性和未保存变更提示。
4. 不要顺手格式化或重写无关文件；保留用户已有工作区改动。
5. 文案改动应保持现有中文术语和命令 ID，不要擅自改动公开配置键名。

## Git 约定

- 提交信息使用简洁的英文 Conventional Commit 风格，例如 `feat: add terminal action reuse`、`fix: validate duplicate action ids`、`docs: update configuration guide`。
- 每次修改完成后都要立即按功能提交 Git；独立功能、修复和文档必须分别提交，不要把无关改动混入同一个提交。
- 提交前检查 `git status --short` 和 `git diff --stat`，只暂存当前请求范围内的文件，并报告保留的无关改动。

## 交付检查清单

- [ ] 行为与 `package.json` schema、README 和现有 UI 术语一致。
- [ ] 已补充或更新相关单元测试。
- [ ] `yarn validate` 通过。
- [ ] `yarn build` 成功生成 VSIX（涉及发布或打包时）。
- [ ] `git diff --check` 通过，且没有意外修改或生成文件。
- [ ] 最终说明包含改动摘要、验证命令及任何已知限制。
