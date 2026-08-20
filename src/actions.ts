import * as vscode from 'vscode';
import { CustomActionItem, ActionType, CommandAction, TerminalAction, UrlAction } from './types';
import { resolveActionVariables } from './variables';

/**
 * 终端实例缓存，用于复用同名终端
 */
const terminalMap = new Map<string, vscode.Terminal>();

/**
 * 终端关闭监听器，插件停用时统一清理
 */
const terminalCloseListeners: vscode.Disposable[] = [];

/**
 * 获取或创建终端
 */
function getOrCreateTerminal(action: TerminalAction): vscode.Terminal {
  const name = action.terminalName || 'Custom Actions Terminal';
  const cwd = action.cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const cacheKey = `${name}\0${cwd}`;

  if (action.reuse !== false) {
    const existing = terminalMap.get(cacheKey);
    if (existing && existing.exitStatus === undefined) {
      // 终端仍然存活，复用
      return existing;
    }
    // 终端已关闭，从缓存中移除
    if (existing) {
      terminalMap.delete(cacheKey);
      existing.dispose();
    }
  }

  // 默认 cwd 为当前工作区目录
  const terminal = vscode.window.createTerminal({
    name,
    cwd: cwd || undefined,
  });

  // 监听终端关闭事件，清理缓存
  const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
    if (closedTerminal === terminal) {
      terminalMap.delete(cacheKey);
      disposable.dispose();
      // 从全局监听列表中移除
      const idx = terminalCloseListeners.indexOf(disposable);
      if (idx !== -1) {
        terminalCloseListeners.splice(idx, 1);
      }
    }
  });

  // 注册到全局监听列表，插件停用时统一清理
  terminalCloseListeners.push(disposable);

  if (action.reuse !== false) {
    terminalMap.set(cacheKey, terminal);
  }

  return terminal;
}

/**
 * 执行 command 动作
 */
async function runCommandAction(action: CommandAction): Promise<void> {
  await vscode.commands.executeCommand(action.command);
}

/**
 * 执行 terminal 动作
 */
function runTerminalAction(action: TerminalAction): void {
  const terminal = getOrCreateTerminal(action);

  if (action.reveal !== false) {
    terminal.show(true);
  }

  terminal.sendText(action.command);
}

/**
 * 执行 url 动作
 */
async function runUrlAction(action: UrlAction): Promise<void> {
  const uri = vscode.Uri.parse(action.url);
  await vscode.env.openExternal(uri);
}

/**
 * 插件停用时清理所有终端相关资源
 */
export function cleanupTerminals(): void {
  for (const listener of terminalCloseListeners) {
    listener.dispose();
  }
  terminalCloseListeners.length = 0;
  terminalMap.clear();
}
export async function runAction(item: CustomActionItem): Promise<void> {
  // 先进行变量替换
  const resolvedAction = resolveActionVariables(item.action);

  try {
    switch (resolvedAction.type) {
      case ActionType.Command:
        await runCommandAction(resolvedAction as CommandAction);
        break;

      case ActionType.Terminal:
        runTerminalAction(resolvedAction as TerminalAction);
        break;

      case ActionType.Url:
        await runUrlAction(resolvedAction as UrlAction);
        break;

      default:
        vscode.window.showErrorMessage(
          `未知的动作类型: "${String((resolvedAction as unknown as { type?: unknown }).type)}"`,
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`执行动作 "${item.label}" 失败: ${message}`);
    console.error(`[Custom Actions] 执行动作 "${item.id}" 失败:`, error);
  }
}
