import * as vscode from 'vscode';
import { CustomActionItem, ValidationError } from '../types';

/**
 * TreeView 节点，包装 CustomActionItem
 */
export class ActionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly actionItem: CustomActionItem,
    public readonly errors?: ValidationError[],
  ) {
    super(actionItem.label, vscode.TreeItemCollapsibleState.None);

    this.description = actionItem.description;
    this.tooltip = actionItem.tooltip || actionItem.description || actionItem.label;
    this.contextValue = 'actionItem';

    // 设置图标
    if (actionItem.icon) {
      this.iconPath = new vscode.ThemeIcon(actionItem.icon);
    } else {
      // 根据动作类型设置默认图标
      switch (actionItem.action.type) {
        case 'command':
          this.iconPath = new vscode.ThemeIcon('symbol-method');
          break;
        case 'terminal':
          this.iconPath = new vscode.ThemeIcon('terminal');
          break;
        case 'url':
          this.iconPath = new vscode.ThemeIcon('globe');
          break;
        default:
          this.iconPath = new vscode.ThemeIcon('symbol-event');
          break;
      }
    }

    // 如果有校验错误，显示警告图标和提示
    if (errors && errors.length > 0) {
      this.iconPath = new vscode.ThemeIcon('warning');
      this.tooltip = errors.map((e) => `[${e.field}] ${e.message}`).join('\n');
      this.description = `⚠ 配置错误: ${errors[0].message}`;
    }

    // 点击时执行动作
    this.command = {
      command: 'customActions.runAction',
      title: '执行动作',
      arguments: [actionItem],
    };
  }
}
