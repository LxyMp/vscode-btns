# Custom Actions Panel

Custom Actions Panel 是一个配置驱动的 VS Code 快捷动作面板。它在 Activity Bar 中提供一个侧边栏，用于快速执行 VS Code 命令、终端命令和 URL。

## 使用

安装扩展后，点击 Activity Bar 的 **Custom Actions** 图标。点击面板标题栏中的齿轮按钮即可打开可视化配置编辑器。

配置编辑器支持：

- 在“用户”和“工作区”配置范围之间切换
- 新增、删除及上下调整动作顺序
- 编辑名称、ID、分组、图标、描述和悬浮提示
- 根据动作类型编辑 VS Code 命令、终端命令或 URL
- 在保存前检查必填字段、重复 ID、参数格式和 URL

保存后仍使用 VS Code 标准设置项 `customActions.items` 存储，因此现有 `settings.json` 配置继续兼容，也可以用于团队共享工作区配置。

面板顶部固定显示“搜索 VS Code 命令”入口，它不属于用户配置，不能删除。列表同时显示命令 ID 和扩展清单提供的本地化标题，不显示快捷键；没有公开标题元数据的内部命令会使用命令 ID 作为描述。

需要直接编辑 JSON 时，最小示例为：

```json
{
  "customActions.items": [
    {
      "id": "dev",
      "label": "启动 Dev",
      "group": "开发",
      "icon": "rocket",
      "action": {
        "type": "terminal",
        "command": "yarn dev",
        "cwd": "${workspaceFolder}",
        "terminalName": "Dev Server",
        "reuse": true,
        "reveal": true
      }
    },
    {
      "id": "local",
      "label": "打开本地服务",
      "action": { "type": "url", "url": "http://localhost:3000" }
    },
    {
      "id": "format",
      "label": "格式化当前文件",
      "action": { "type": "command", "command": "editor.action.formatDocument" }
    }
  ]
}
```

相同 `group` 的动作会显示在同一个可折叠分组中。未填写 `group` 的动作直接显示在面板根部。

## 动作类型

- `command`：执行 VS Code 命令，可选 `args` 数组。
- `terminal`：创建或复用终端。支持 `cwd`、`terminalName`、`reuse` 和 `reveal`。
- `url`：使用系统默认浏览器打开 URL。

## 变量

字符串字段支持以下变量：

| 变量 | 含义 |
| --- | --- |
| `${workspaceFolder}` | 当前第一个工作区目录 |
| `${file}` | 当前活动文件完整路径 |
| `${fileDirname}` | 当前活动文件所在目录 |
| `${fileBasename}` | 当前文件名，包含扩展名 |
| `${fileBasenameNoExtension}` | 当前文件名，不包含扩展名 |
| `${fileExtname}` | 当前文件扩展名 |
| `${selectedText}` | 当前选中文本 |
| `${env:NAME}` | 环境变量 |

没有工作区或活动文件时，对应变量会替换为空字符串；使用 `${workspaceFolder}` 时会显示提示。

## 配置校验

面板会标记无效动作。校验包括必填字段、字段类型、重复 `id`、命令参数数组以及 URL 协议。点击无效动作前会再次校验并显示具体错误。

## 安全

终端命令只会在用户点击动作时执行。请审查来源不明的配置，尤其是团队共享的 `settings.json`，不要将未经审核的远程配置自动导入。

## 开发

```bash
yarn install
yarn validate   # lint、单元测试、TypeScript 编译
yarn build      # 编译并生成 dist/*.vsix
```

按 `F5` 可在 VS Code Extension Development Host 中调试。

## 许可证

MIT
