import * as vscode from 'vscode';
import { CustomActionItem } from './types';
export { validateAllItems, validateItem } from './validation';

/**
 * 从 settings.json 中读取自定义动作配置
 */
export function getConfiguredItems(): CustomActionItem[] {
  const config = vscode.workspace.getConfiguration('customActions');
  const items = config.get<unknown>('items', []);
  return Array.isArray(items) ? (items as CustomActionItem[]) : [];
}

export function getRawConfiguredItems(): unknown {
  const config = vscode.workspace.getConfiguration('customActions');
  return config.get<unknown>('items', []);
}
