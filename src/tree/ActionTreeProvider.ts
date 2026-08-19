import * as vscode from 'vscode';
import { ActionTreeItem } from './ActionTreeItem';
import { getConfiguredItems, validateAllItems } from '../config';
import { CustomActionItem } from '../types';

/**
 * TreeView 数据提供器
 */
export class ActionTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem>, vscode.Disposable {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> =
    new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;
  private readonly configurationListener: vscode.Disposable;

  constructor() {
    // 监听配置变更，自动刷新 TreeView
    this.configurationListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('customActions.items')) {
        this.refresh();
      }
    });
  }

  dispose(): void {
    this.configurationListener.dispose();
    this._onDidChangeTreeData.dispose();
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
      if (element instanceof ActionGroupTreeItem) {
        const errors = validateAllItems(getConfiguredItems());
        return element.items.map((item) => this.toActionTreeItem(item, errors));
      }
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

    const groups = new Map<string, CustomActionItem[]>();
    const validationErrors = validateAllItems(items);
    for (const item of items) {
      const group = typeof item.group === 'string' ? item.group.trim() : '';
      const groupItems = groups.get(group) || [];
      groupItems.push(item);
      groups.set(group, groupItems);
    }

    for (const [group, groupItems] of groups) {
      if (group) {
        result.push(new ActionGroupTreeItem(group, groupItems));
      } else {
        result.push(...groupItems.map((item) => this.toActionTreeItem(item, validationErrors)));
      }
    }

    return result;
  }

  private toActionTreeItem(
    item: CustomActionItem,
    allErrors = validateAllItems([item]),
  ): ActionTreeItem {
    const errors = allErrors.filter((error) => error.itemId === item.id || error.itemId === 'unknown');
    return new ActionTreeItem(item, errors.length > 0 ? errors : undefined);
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
    placeholderItem.tooltip = '点击打开可视化配置面板';
    placeholderItem.contextValue = 'placeholder';

    return [placeholderItem];
  }
}

class ActionGroupTreeItem extends vscode.TreeItem {
  constructor(label: string, public readonly items: CustomActionItem[]) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon('folder');
    this.contextValue = 'actionGroup';
  }
}
