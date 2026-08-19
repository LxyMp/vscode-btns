import * as vscode from 'vscode';
import { CustomActionItem, ValidationError, ActionType } from './types';

/**
 * 从 settings.json 中读取自定义动作配置
 */
export function getConfiguredItems(): CustomActionItem[] {
  const config = vscode.workspace.getConfiguration('customActions');
  const items = config.get<CustomActionItem[]>('items', []);
  return items;
}

/**
 * 校验单个动作项的配置
 */
export function validateItem(item: CustomActionItem): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!item.id || typeof item.id !== 'string') {
    errors.push({ itemId: item.id || 'unknown', field: 'id', message: '缺少 id' });
  }

  if (!item.label || typeof item.label !== 'string') {
    errors.push({ itemId: item.id || 'unknown', field: 'label', message: '缺少 label' });
  }

  if (!item.action) {
    errors.push({ itemId: item.id || 'unknown', field: 'action', message: '缺少 action' });
    return errors;
  }

  const { action } = item;

  if (!action.type || !Object.values(ActionType).includes(action.type)) {
    errors.push({
      itemId: item.id,
      field: 'action.type',
      message: `无效的 action.type: "${action.type}"，支持的类型: ${Object.values(ActionType).join(', ')}`,
    });
    return errors;
  }

  switch (action.type) {
    case ActionType.Command:
      if (!action.command || typeof action.command !== 'string') {
        errors.push({
          itemId: item.id,
          field: 'action.command',
          message: 'command 类型必须提供 command 字段',
        });
      }
      break;

    case ActionType.Terminal:
      if (!action.command || typeof action.command !== 'string') {
        errors.push({
          itemId: item.id,
          field: 'action.command',
          message: 'terminal 类型必须提供 command 字段',
        });
      }
      break;

    case ActionType.Url:
      if (!action.url || typeof action.url !== 'string') {
        errors.push({ itemId: item.id, field: 'action.url', message: 'url 类型必须提供 url 字段' });
      }
      break;
  }

  return errors;
}

/**
 * 校验所有配置项
 */
export function validateAllItems(items: CustomActionItem[]): ValidationError[] {
  const allErrors: ValidationError[] = [];
  for (const item of items) {
    allErrors.push(...validateItem(item));
  }
  return allErrors;
}
