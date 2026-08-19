## Spec：VS Code 自定义快捷动作面板插件

### 1. 插件定位

开发一个 VS Code 插件，在左侧 **Activity Bar** 添加一个自定义图标入口。点击该图标后打开一个侧边栏面板，面板中根据用户配置展示自定义快捷动作按钮 / 菜单项。

用户点击动作项后，插件可以执行以下操作：

- 执行 VS Code 内置或扩展命令
- 执行终端命令
- 打开自定义 URL
- 后续可扩展为执行 Task、复制文本、组合动作等

插件目标是为项目开发提供一个配置驱动的快捷操作中心，适合快速启动服务、打开本地页面、执行脚本、调用 VS Code 功能、打开内部系统等。

---

## 2. 目标用户

### 2.1 主要用户

- VS Code 重度用户
- 前端 / 后端 / 全栈开发者
- 需要频繁启动项目脚本的人
- 有多个项目环境、多个本地服务地址的人
- 企业内部开发团队
- 需要为团队统一配置快捷动作入口的人

### 2.2 典型使用场景

- 一键启动 `pnpm dev`
- 一键打开 `http://localhost:5173`
- 一键执行 `pnpm build`
- 一键格式化当前文件
- 一键打开项目接口文档
- 一键打开公司内部系统
- 一键运行测试命令
- 一键打开 VS Code 设置、命令面板、终端等

---

## 3. 插件核心功能

### 3.1 Activity Bar 图标入口

插件安装后，在 VS Code 左侧 Activity Bar 中新增一个图标，例如：

```text
Custom Actions
```

点击图标后打开插件面板。

### 3.2 自定义动作面板

面板展示用户配置的动作项。

第一版建议使用 `TreeView` 实现，保持 VS Code 原生风格。

面板中每个动作项显示：

- 图标
- 名称
- 描述
- tooltip
- 分组，后续支持

例如：

```text
快捷动作

开发
    🚀 启动 Dev
    🌐 打开本地服务
    📦 安装依赖

编辑器
    🧹 格式化当前文件
    💾 保存全部文件
```

### 3.3 配置驱动

用户通过 `settings.json` 配置动作项。

第一版配置示例：

```json
{
  "customActions.items": [
    {
      "id": "dev",
      "label": "启动 Dev",
      "description": "pnpm dev",
      "icon": "rocket",
      "action": {
        "type": "terminal",
        "command": "pnpm dev",
        "cwd": "${workspaceFolder}",
        "terminalName": "Dev Server",
        "reuse": true,
        "reveal": true
      }
    },
    {
      "id": "open-local",
      "label": "打开本地服务",
      "description": "http://localhost:5173",
      "icon": "globe",
      "action": {
        "type": "url",
        "url": "http://localhost:5173"
      }
    },
    {
      "id": "format-document",
      "label": "格式化当前文件",
      "description": "editor.action.formatDocument",
      "icon": "wand",
      "action": {
        "type": "command",
        "command": "editor.action.formatDocument"
      }
    }
  ]
}
```

### 3.4 动作类型

第一版支持三种动作类型。

#### 3.4.1 `command`

执行 VS Code 命令。

```json
{
  "type": "command",
  "command": "editor.action.formatDocument",
  "args": []
}
```

执行逻辑：

```ts
await vscode.commands.executeCommand(command, ...args);
```

#### 3.4.2 `terminal`

创建或复用终端并执行命令。

```json
{
  "type": "terminal",
  "command": "pnpm dev",
  "cwd": "${workspaceFolder}",
  "terminalName": "Dev Server",
  "reuse": true,
  "reveal": true
}
```

行为：

- `reuse: true` 时复用同名终端
- `reuse: false` 时每次新建终端
- `reveal: true` 时显示终端
- `cwd` 支持变量替换

#### 3.4.3 `url`

打开外部 URL。

```json
{
  "type": "url",
  "url": "https://example.com"
}
```

执行逻辑：

```ts
await vscode.env.openExternal(vscode.Uri.parse(url));
```

---

## 4. 第一版范围

### 4.1 必做功能

- Activity Bar 图标
- 自定义侧边栏面板
- 从 `settings.json` 加载动作配置
- TreeView 展示动作项
- 点击动作项执行动作
- 支持 `command`
- 支持 `terminal`
- 支持 `url`
- 支持配置变更后自动刷新面板
- 支持基本变量替换
- 支持打开插件配置
- 支持刷新按钮

### 4.2 第一版不做

- 顶栏右上角按钮
- 真实模拟键盘快捷键
- 自定义系统弹出菜单
- Webview 高级 UI
- 拖拽排序
- 图形化配置页面
- 多级复杂菜单
- 动作执行历史
- 团队远程配置同步
- Marketplace 发布自动化

---

## 5. 配置项设计

### 5.1 顶层配置

```json
{
  "customActions.items": []
}
```

### 5.2 Item Schema

```ts
type CustomActionItem = {
  id: string;
  label: string;
  description?: string;
  tooltip?: string;
  icon?: string;
  action: CustomAction;
};
```

字段说明：

| 字段          | 类型     | 必填 | 说明                                                     |
| ------------- | -------- | ---: | -------------------------------------------------------- |
| `id`          | `string` |   是 | 动作唯一 ID                                              |
| `label`       | `string` |   是 | 面板中显示的名称                                         |
| `description` | `string` |   否 | 显示在动作右侧的说明                                     |
| `tooltip`     | `string` |   否 | 鼠标悬浮提示                                             |
| `icon`        | `string` |   否 | VS Code Codicon 名称，例如 `rocket`、`globe`、`terminal` |
| `action`      | `object` |   是 | 动作定义                                                 |

### 5.3 Action Schema

#### `command` 类型

```ts
type CommandAction = {
  type: 'command';
  command: string;
  args?: unknown[];
};
```

#### `terminal` 类型

```ts
type TerminalAction = {
  type: 'terminal';
  command: string;
  cwd?: string;
  terminalName?: string;
  reuse?: boolean;
  reveal?: boolean;
};
```

#### `url` 类型

```ts
type UrlAction = {
  type: 'url';
  url: string;
};
```

### 5.4 变量替换

第一版支持：

| 变量                 | 含义                 |
| -------------------- | -------------------- |
| `${workspaceFolder}` | 当前第一个工作区目录 |
| `${file}`            | 当前活动文件完整路径 |
| `${fileDirname}`     | 当前活动文件所在目录 |
| `${fileBasename}`    | 当前活动文件名       |
| `${fileExtname}`     | 当前活动文件扩展名   |
| `${selectedText}`    | 当前选中文本         |
| `${env:NAME}`        | 环境变量             |

示例：

```json
{
  "type": "terminal",
  "command": "node ${file}",
  "cwd": "${fileDirname}"
}
```

---

## 6. UI 设计

### 6.1 Activity Bar

贡献点：

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "customActions",
          "title": "Custom Actions",
          "icon": "resources/activity-icon.svg"
        }
      ]
    }
  }
}
```

### 6.2 TreeView 面板

贡献点：

```json
{
  "contributes": {
    "views": {
      "customActions": [
        {
          "id": "customActionsView",
          "name": "快捷动作"
        }
      ]
    }
  }
}
```

### 6.3 面板标题栏按钮

面板右上角提供：

- 刷新
- 打开配置

```json
{
  "menus": {
    "view/title": [
      {
        "command": "customActions.refresh",
        "when": "view == customActionsView",
        "group": "navigation"
      },
      {
        "command": "customActions.openSettings",
        "when": "view == customActionsView",
        "group": "navigation"
      }
    ]
  }
}
```

---

## 7. 错误处理

### 7.1 配置为空

面板显示空状态提示。

TreeView 可以返回一个提示项：

```text
未配置快捷动作，点击打开配置
```

点击后打开设置。

### 7.2 动作配置错误

例如：

- 缺少 `action.type`
- 缺少 `command`
- URL 格式错误
- 终端命令为空

处理方式：

- 点击时提示错误
- 不让插件崩溃
- 在开发控制台输出详细日志

### 7.3 执行命令失败

```ts
try {
  await runAction(action);
} catch (error) {
  vscode.window.showErrorMessage(`执行动作失败：${message}`);
}
```

### 7.4 无工作区

如果使用 `${workspaceFolder}` 但当前没有打开文件夹：

- 替换为空字符串
- 或提示用户当前没有工作区

第一版建议：

```text
当前没有打开工作区，无法解析 ${workspaceFolder}
```

---

## 8. 安全说明

插件允许执行用户配置的终端命令，因此需要明确：

- 插件不会自动执行配置项
- 只有用户点击动作时才执行
- 不建议执行来源不明的配置
- 团队共享配置前需要审查命令内容
- 插件不应从远程 URL 拉取配置并自动执行

---

## 9. 技术架构

### 9.1 模块拆分

建议目录：

```text
custom-actions/
    package.json
    tsconfig.json
    src/
        extension.ts
        config.ts
        actions.ts
        variables.ts
        tree/
            ActionTreeProvider.ts
            ActionTreeItem.ts
        types.ts
    resources/
        activity-icon.svg
```

### 9.2 模块职责

| 文件                    | 职责                                       |
| ----------------------- | ------------------------------------------ |
| `extension.ts`          | 插件入口，注册命令、TreeView、监听配置变化 |
| `types.ts`              | 类型定义                                   |
| `config.ts`             | 读取和校验配置                             |
| `actions.ts`            | 执行动作                                   |
| `variables.ts`          | 变量替换                                   |
| `ActionTreeProvider.ts` | TreeView 数据提供                          |
| `ActionTreeItem.ts`     | TreeView 节点定义                          |
| `activity-icon.svg`     | Activity Bar 图标                          |

---

## 10. Plan：开发计划

## 阶段 1：初始化插件项目

### 目标

创建 VS Code 插件基础工程。

### 任务

- 使用官方脚手架创建 TypeScript 插件
- 设置插件名称和基本信息
- 配置 `package.json`
- 配置编译脚本
- 启动 Extension Development Host 验证插件可运行

### 命令示例

```bash
npm install -g yo generator-code
yo code
```

选择：

```text
New Extension (TypeScript)
```

建议插件名：

```text
custom-actions-panel
```

---

## 阶段 2：添加 Activity Bar 图标和 View

### 目标

在左侧 Activity Bar 出现自定义图标，点击后打开空面板。

### 任务

- 新增 `resources/activity-icon.svg`
- 配置 `viewsContainers.activitybar`
- 配置 `views`
- 注册空的 `TreeDataProvider`
- 验证 Activity Bar 图标可以显示
- 验证点击后可以打开侧边栏 View

### 验收标准

- 左侧 Activity Bar 出现插件图标
- 点击图标后打开名为“快捷动作”的面板
- 面板可以显示空内容或占位项

---

## 阶段 3：设计配置 Schema

### 目标

让用户可以在 `settings.json` 中配置动作项，并获得基本补全和说明。

### 任务

- 在 `package.json` 中添加 `contributes.configuration`
- 定义 `customActions.items`
- 配置 JSON Schema
- 添加默认示例
- 编写 TypeScript 类型定义

### 验收标准

- `settings.json` 中输入 `customActions.items` 有提示
- 配置数组能被插件读取
- 插件能处理空配置

---

## 阶段 4：TreeView 渲染配置项

### 目标

根据配置动态展示菜单项。

### 任务

- 实现 `getConfiguredItems`
- 实现 `ActionTreeItem`
- 实现 `ActionTreeProvider`
- 支持 `label`
- 支持 `description`
- 支持 `tooltip`
- 支持 `icon`
- 点击节点时调用统一命令 `customActions.runAction`
- 监听配置变化并刷新 TreeView

### 验收标准

- 修改 `settings.json` 后面板自动刷新
- 配置几个动作后，TreeView 中能显示对应项目
- 图标、描述、tooltip 显示正常
- 点击项目能进入统一执行函数

---

## 阶段 5：实现 `command` 动作

### 目标

支持执行 VS Code 命令。

### 任务

- 实现 `runCommandAction`
- 支持 `args`
- 添加错误捕获
- 测试常用命令

测试配置：

```json
{
  "customActions.items": [
    {
      "id": "quick-open",
      "label": "快速打开",
      "icon": "search",
      "action": {
        "type": "command",
        "command": "workbench.action.quickOpen"
      }
    },
    {
      "id": "format",
      "label": "格式化文档",
      "icon": "wand",
      "action": {
        "type": "command",
        "command": "editor.action.formatDocument"
      }
    }
  ]
}
```

### 验收标准

- 点击动作可以打开 Quick Open
- 点击动作可以格式化当前文档
- 错误命令会提示失败，不导致插件崩溃

---

## 阶段 6：实现 `terminal` 动作

### 目标

支持打开终端并执行命令。

### 任务

- 实现 `runTerminalAction`
- 支持 `command`
- 支持 `cwd`
- 支持 `terminalName`
- 支持 `reuse`
- 支持 `reveal`
- 维护终端缓存 Map
- 处理终端关闭后的缓存清理

测试配置：

```json
{
  "customActions.items": [
    {
      "id": "dev",
      "label": "启动 Dev",
      "icon": "rocket",
      "description": "pnpm dev",
      "action": {
        "type": "terminal",
        "command": "pnpm dev",
        "cwd": "${workspaceFolder}",
        "terminalName": "Dev Server",
        "reuse": true,
        "reveal": true
      }
    }
  ]
}
```

### 验收标准

- 点击动作可以打开终端
- 命令能正确发送到终端
- `reuse: true` 时复用同名终端
- `reuse: false` 时每次新建终端
- `reveal: false` 时不主动显示终端

---

## 阶段 7：实现 `url` 动作

### 目标

支持打开外部 URL。

### 任务

- 实现 `runUrlAction`
- 使用 `vscode.env.openExternal`
- 支持变量替换
- 检查 URL 合法性
- 对非法 URL 给出错误提示

测试配置：

```json
{
  "customActions.items": [
    {
      "id": "local",
      "label": "打开本地服务",
      "icon": "globe",
      "description": "localhost:5173",
      "action": {
        "type": "url",
        "url": "http://localhost:5173"
      }
    }
  ]
}
```

### 验收标准

- 点击动作能打开浏览器
- HTTP / HTTPS URL 正常
- 非法 URL 有错误提示

---

## 阶段 8：实现变量替换

### 目标

支持在命令、URL、cwd 中使用变量。

### 任务

- 实现 `resolveVariables`
- 支持 `${workspaceFolder}`
- 支持 `${file}`
- 支持 `${fileDirname}`
- 支持 `${fileBasename}`
- 支持 `${fileExtname}`
- 支持 `${selectedText}`
- 支持 `${env:NAME}`
- 处理无工作区、无活动编辑器的情况

测试配置：

```json
{
  "customActions.items": [
    {
      "id": "run-current-file",
      "label": "运行当前文件",
      "icon": "play",
      "action": {
        "type": "terminal",
        "command": "node ${file}",
        "cwd": "${fileDirname}",
        "terminalName": "Run File",
        "reuse": false,
        "reveal": true
      }
    }
  ]
}
```

### 验收标准

- 当前文件路径替换正确
- 当前文件目录替换正确
- 环境变量替换正确
- 选中文本替换正确

---

## 阶段 9：添加面板标题栏命令

### 目标

提升使用体验。

### 任务

- 添加 `customActions.refresh`
- 添加 `customActions.openSettings`
- 在 `view/title` 中显示刷新按钮
- 在 `view/title` 中显示打开设置按钮
- 可选：添加 `customActions.showQuickPick`

### 验收标准

- 点击刷新按钮可以刷新列表
- 点击设置按钮打开插件配置
- 命令面板中可以搜索到相关命令

---

## 阶段 10：完善配置校验和错误提示

### 目标

提升稳定性。

### 任务

- 校验 `id`
- 校验 `label`
- 校验 `action.type`
- 校验 `command`
- 校验 `url`
- 校验终端命令
- 错误项在 TreeView 中可以显示为 warning 图标，后续可选
- 执行失败时显示错误消息

### 验收标准

- 错误配置不会导致插件崩溃
- 用户能知道哪个配置项有问题
- 控制台能看到详细错误

---

## 阶段 11：编写 README

### 目标

让插件可以被他人使用。

### README 内容

- 插件简介
- 功能列表
- 安装方式
- 配置示例
- 动作类型说明
- 变量说明
- 常见 VS Code command 示例
- 安全说明
- 已知限制
- Roadmap

---

## 阶段 12：打包和本地安装测试

### 目标

生成 `.vsix` 并测试安装。

### 任务

- 安装 `vsce`

```bash
npm install -g @vscode/vsce
```

- 打包插件

```bash
vsce package
```

- 本地安装

```bash
code --install-extension custom-actions-panel-0.0.1.vsix
```

### 验收标准

- 插件能被本地 VS Code 安装
- Activity Bar 图标正常显示
- 配置项正常工作
- 三种动作类型都可执行

---

## 11. MVP 验收清单

第一版完成时，应满足：

- Activity Bar 有自定义图标
- 点击图标打开“快捷动作”面板
- 面板从配置读取动作项
- 配置变更后自动刷新
- 点击动作可执行 VS Code command
- 点击动作可执行终端命令
- 点击动作可打开 URL
- 支持基本变量替换
- 有刷新按钮
- 有打开配置按钮
- 错误不会导致插件崩溃
- 可以打包成 `.vsix`

---

## 12. 后续 Roadmap

### 12.1 分组支持

配置：

```json
{
  "customActions.groups": [
    {
      "id": "dev",
      "label": "开发",
      "items": []
    }
  ]
}
```

TreeView 显示为可展开分组。

### 12.2 QuickPick 模式

增加命令：

```text
Custom Actions: Show Quick Pick
```

支持快速搜索动作。

### 12.3 Webview 高级面板

替代 TreeView，提供更漂亮的 UI：

- 搜索框
- 卡片按钮
- 分组
- 图标
- 最近使用
- 收藏
- 快捷键提示

### 12.4 支持 VS Code Task

新增动作类型：

```json
{
  "type": "task",
  "task": "build"
}
```

### 12.5 支持组合动作

新增动作类型：

```json
{
  "type": "sequence",
  "actions": [
    {
      "type": "terminal",
      "command": "pnpm dev"
    },
    {
      "type": "url",
      "url": "http://localhost:5173"
    }
  ]
}
```

### 12.6 支持确认弹窗

```json
{
  "confirm": true,
  "confirmMessage": "确定要执行生产部署吗？"
}
```

### 12.7 支持条件显示

```json
{
  "when": "resourceExtname == .vue"
}
```

### 12.8 支持项目内配置文件

除了 `settings.json`，支持：

```text
.vscode/custom-actions.json
```

好处：

- 方便团队共享
- 不污染用户全局设置
- 项目级配置更清晰

---

## 13. 推荐第一版技术路线

建议按以下顺序开发：

```text
Activity Bar 入口
    ↓
TreeView 空面板
    ↓
读取配置
    ↓
渲染动作项
    ↓
执行 command
    ↓
执行 terminal
    ↓
执行 url
    ↓
变量替换
    ↓
错误处理
    ↓
打包测试
```

这个方案完全基于 VS Code 官方扩展 API，稳定、可维护、可发布。
