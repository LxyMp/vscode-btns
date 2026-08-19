import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAllItems, validateItem } from '../src/validation';

test('accepts valid command, terminal, and URL actions', () => {
  const items = [
    { id: 'format', label: '格式化', action: { type: 'command', command: 'editor.action.formatDocument', args: [] } },
    { id: 'dev', label: '开发服务', group: '开发', action: { type: 'terminal', command: 'yarn dev', reuse: true } },
    { id: 'docs', label: '文档', action: { type: 'url', url: 'https://example.com/${env:PAGE}' } },
  ];

  assert.deepEqual(validateAllItems(items), []);
});

test('reports duplicate IDs and invalid field types', () => {
  const errors = validateAllItems([
    { id: 'same', label: 'A', action: { type: 'command', command: 'a', args: 'invalid' } },
    { id: 'same', label: 'B', action: { type: 'terminal', command: 'b', reuse: 'yes' } },
  ]);

  assert.ok(errors.some((error) => error.field === 'id' && error.message.includes('重复')));
  assert.ok(errors.some((error) => error.field === 'action.args'));
  assert.ok(errors.some((error) => error.field === 'action.reuse'));
});

test('rejects whitespace-only fields and malformed URLs', () => {
  assert.ok(validateItem({ id: ' ', label: '', action: { type: 'url', url: 'example' } }).length >= 3);
});

test('rejects a non-array root configuration', () => {
  assert.deepEqual(validateAllItems({}), [
    { itemId: 'configuration', field: 'customActions.items', message: '配置必须是数组' },
  ]);
});
