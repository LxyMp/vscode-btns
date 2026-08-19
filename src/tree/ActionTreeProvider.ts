import * as vscode from 'vscode';
import { ActionTreeItem } from './ActionTreeItem';
import { getConfiguredItems, validateItem } from '../config';
import { CustomActionItem } from '../types';

/**
 * TreeView 数据提供器
 */
export class ActionTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> =
    new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor() {
    // 监听配置变更，自动刷新 TreeView
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('customActions.items')) {
        this.refresh();
      }
    });
  }

  /**
   * 刷新 TreeView
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * 获取树节点
   */
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * 获取子节点
   */
  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (element) {
      return [];
    }

    const result: vscode.TreeItem[] = [];

    // 顶部搜索入口
    const searchItem = new vscode.TreeItem(
      '搜索 VS Code 命令...',
      vscode.TreeItemCollapsibleState.None,
    );
    searchItem.iconPath = new vscode.ThemeIcon('search');
    searchItem.tooltip = '打开下拉框搜索并执行任意 VS Code 命令';
    searchItem.command = {
      command: 'customActions.searchCommands',
      title: '搜索命令',
    };
    searchItem.contextValue = 'searchCommand';
    result.push(searchItem);

    const items = getConfiguredItems();

    if (items.length === 0) {
      result.push(...this.getEmptyPlaceholder());
      return result;
    }

    // 构建 TreeItem 列表，包含校验信息
    for (const item of items) {
      const errors = validateItem(item);
      result.push(new ActionTreeItem(item, errors.length > 0 ? errors : undefined));
    }

    return result;
  }

  /**
   * 获取指定动作项（用于命令调用）
   */
  getActionItem(itemId: string): CustomActionItem | undefined {
    const items = getConfiguredItems();
    return items.find((item) => item.id === itemId);
  }

  /**
   * 配置为空时的占位提示
   */
  private getEmptyPlaceholder(): vscode.TreeItem[] {
    const placeholderItem = new vscode.TreeItem(
      '未配置快捷动作，点击打开配置',
      vscode.TreeItemCollapsibleState.None,
    );
    placeholderItem.iconPath = new vscode.ThemeIcon('info');
    placeholderItem.command = {
      command: 'customActions.openSettings',
      title: '打开配置',
    };
    placeholderItem.tooltip = '点击打开 settings.json 配置快捷动作';
    placeholderItem.contextValue = 'placeholder';

    return [placeholderItem];
  }
}
