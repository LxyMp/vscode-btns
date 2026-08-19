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

export type ConfigurationScope = 'user' | 'workspace';

export function getConfiguredItemsForScope(scope: ConfigurationScope): unknown {
  const inspected = vscode.workspace.getConfiguration('customActions').inspect<unknown>('items');
  const value = scope === 'user' ? inspected?.globalValue : inspected?.workspaceValue;
  return value ?? [];
}

export function getPreferredConfigurationScope(): ConfigurationScope {
  const inspected = vscode.workspace.getConfiguration('customActions').inspect<unknown>('items');
  return inspected?.workspaceValue !== undefined ? 'workspace' : 'user';
}

export async function updateConfiguredItemsForScope(
  scope: ConfigurationScope,
  items: CustomActionItem[],
): Promise<void> {
  const target =
    scope === 'user' ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
  await vscode.workspace.getConfiguration('customActions').update('items', items, target);
}
