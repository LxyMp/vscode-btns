import { ActionType, CustomActionItem, ValidationError } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateOptionalString(
  itemId: string,
  object: Record<string, unknown>,
  field: string,
  errors: ValidationError[],
): void {
  if (object[field] !== undefined && typeof object[field] !== 'string') {
    errors.push({ itemId, field, message: `${field} 必须是字符串` });
  }
}

function isValidExternalUrl(value: string): boolean {
  const substituted = value.replace(/\$\{[^}]+\}/g, 'value');
  try {
    const url = new URL(substituted);
    return url.protocol.length > 1;
  } catch {
    return false;
  }
}

export function validateItem(item: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isRecord(item)) {
    return [{ itemId: 'unknown', field: 'item', message: '动作项必须是对象' }];
  }

  const itemId = isNonEmptyString(item.id) ? item.id : 'unknown';
  if (!isNonEmptyString(item.id)) {
    errors.push({ itemId, field: 'id', message: 'id 必须是非空字符串' });
  }
  if (!isNonEmptyString(item.label)) {
    errors.push({ itemId, field: 'label', message: 'label 必须是非空字符串' });
  }
  for (const field of ['group', 'description', 'tooltip', 'icon']) {
    validateOptionalString(itemId, item, field, errors);
  }

  if (!isRecord(item.action)) {
    errors.push({ itemId, field: 'action', message: 'action 必须是对象' });
    return errors;
  }

  const action = item.action;
  if (!Object.values(ActionType).includes(action.type as ActionType)) {
    errors.push({
      itemId,
      field: 'action.type',
      message: `无效的 action.type: "${String(action.type)}"，支持的类型: ${Object.values(ActionType).join(', ')}`,
    });
    return errors;
  }

  if (action.type === ActionType.Command || action.type === ActionType.Terminal) {
    if (!isNonEmptyString(action.command)) {
      errors.push({
        itemId,
        field: 'action.command',
        message: `${action.type} 类型必须提供非空 command 字段`,
      });
    }
  }

  if (action.type === ActionType.Command && action.args !== undefined && !Array.isArray(action.args)) {
    errors.push({ itemId, field: 'action.args', message: 'args 必须是数组' });
  }

  if (action.type === ActionType.Terminal) {
    for (const field of ['cwd', 'terminalName']) {
      if (action[field] !== undefined && typeof action[field] !== 'string') {
        errors.push({ itemId, field: `action.${field}`, message: `${field} 必须是字符串` });
      }
    }
    for (const field of ['reuse', 'reveal']) {
      if (action[field] !== undefined && typeof action[field] !== 'boolean') {
        errors.push({ itemId, field: `action.${field}`, message: `${field} 必须是布尔值` });
      }
    }
  }

  if (action.type === ActionType.Url) {
    if (!isNonEmptyString(action.url)) {
      errors.push({ itemId, field: 'action.url', message: 'url 类型必须提供非空 url 字段' });
    } else if (!isValidExternalUrl(action.url)) {
      errors.push({ itemId, field: 'action.url', message: 'url 必须包含有效的协议和地址' });
    }
  }

  return errors;
}

export function validateAllItems(items: unknown): ValidationError[] {
  if (!Array.isArray(items)) {
    return [{ itemId: 'configuration', field: 'customActions.items', message: '配置必须是数组' }];
  }

  const errors = items.flatMap(validateItem);
  const seenIds = new Set<string>();
  for (const item of items) {
    if (!isRecord(item) || !isNonEmptyString(item.id)) {
      continue;
    }
    if (seenIds.has(item.id)) {
      errors.push({ itemId: item.id, field: 'id', message: `id "${item.id}" 重复` });
    }
    seenIds.add(item.id);
  }
  return errors;
}

export function isCustomActionItem(item: unknown): item is CustomActionItem {
  return validateItem(item).length === 0;
}
