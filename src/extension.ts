import * as vscode from 'vscode';
import { ActionTreeProvider } from './tree/ActionTreeProvider';
import { runAction, cleanupTerminals } from './actions';
import { validateAllItems, getConfiguredItems, getRawConfiguredItems } from './config';
import { CustomActionItem } from './types';

/**
 * 插件激活入口
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('[Custom Actions] 插件已激活');

  // 创建 TreeView 数据提供器
  const treeProvider = new ActionTreeProvider();
  context.subscriptions.push(treeProvider);

  // 注册 TreeView
  const treeView = vscode.window.createTreeView('customActionsView', {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });

  context.subscriptions.push(treeView);

  // ========== 注册命令 ==========

  /**
   * 执行动作
   */
  const runActionDisposable = vscode.commands.registerCommand(
    'customActions.runAction',
    async (actionItem: CustomActionItem) => {
      if (!actionItem) {
        vscode.window.showErrorMessage('未指定要执行的动作');
        return;
      }

      // 校验配置
      const items = getConfiguredItems();
      const targetItem = items.find((i) => i.id === actionItem.id);
      if (!targetItem) {
        vscode.window.showErrorMessage(`找不到动作 "${actionItem.id}"`);
        return;
      }

      // 执行前校验
      const errors = validateAllItems(items).filter((error) => error.itemId === targetItem.id);
      if (errors.length > 0) {
        const errorMsg = errors.map((e) => `[${e.field}] ${e.message}`).join('; ');
        vscode.window.showErrorMessage(`动作配置错误: ${errorMsg}`);
        return;
      }

      await runAction(targetItem);
    },
  );

  context.subscriptions.push(runActionDisposable);

  /**
   * 搜索并执行 VS Code 命令（面板顶部下拉框）
   */
  const searchDisposable = vscode.commands.registerCommand(
    'customActions.searchCommands',
    async () => {
      const allCommands = await vscode.commands.getCommands(true);
      const quickPick = vscode.window.createQuickPick();
      quickPick.placeholder = '搜索 VS Code 命令...';
      quickPick.matchOnDescription = true;
      quickPick.matchOnDetail = true;

      // 构建选项列表
      quickPick.items = allCommands.map((cmd) => ({ label: cmd }));

      quickPick.onDidChangeSelection(async (selection) => {
        if (selection[0]) {
          quickPick.hide();
          try {
            await vscode.commands.executeCommand(selection[0].label);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`执行命令 "${selection[0].label}" 失败: ${message}`);
          }
        }
      });

      quickPick.onDidHide(() => quickPick.dispose());
      quickPick.show();
    },
  );

  context.subscriptions.push(searchDisposable);

  /**
   * 刷新面板
   */
  const refreshDisposable = vscode.commands.registerCommand('customActions.refresh', () => {
    treeProvider.refresh();
  });

  context.subscriptions.push(refreshDisposable);

  /**
   * 打开配置
   */
  const openSettingsDisposable = vscode.commands.registerCommand(
    'customActions.openSettings',
    () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'customActions.items');
    },
  );

  context.subscriptions.push(openSettingsDisposable);

  // ========== 日志输出 ==========

  const items = getConfiguredItems();
  if (items.length === 0) {
    console.log(
      '[Custom Actions] 当前未配置快捷动作，请在 settings.json 中添加 customActions.items',
    );
  } else {
    console.log(`[Custom Actions] 已加载 ${items.length} 个快捷动作`);
    // 校验并输出警告
    const errors = validateAllItems(getRawConfiguredItems());
    if (errors.length > 0) {
      console.warn('[Custom Actions] 配置校验发现问题:');
      for (const error of errors) {
        console.warn(`  - [${error.itemId}] ${error.field}: ${error.message}`);
      }
    }
  }
}

/**
 * 插件停用
 */
export function deactivate() {
  cleanupTerminals();
  console.log('[Custom Actions] 插件已停用');
}
