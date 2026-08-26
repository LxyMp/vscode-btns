import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCommandQuickPickItems, collectCommandTitles } from '../src/commandMetadata';

test('collects string and localized object command titles', () => {
  const titles = collectCommandTitles([
    {
      packageJSON: {
        contributes: {
          commands: [
            { command: 'extension.first', title: '第一个命令' },
            { command: 'extension.second', title: { value: '第二个命令', original: 'Second' } },
          ],
        },
      },
    },
  ]);

  assert.equal(titles.get('extension.first'), '第一个命令');
  assert.equal(titles.get('extension.second'), '第二个命令');
});

test('ignores malformed command contributions', () => {
  const titles = collectCommandTitles([
    { packageJSON: { contributes: { commands: [{ command: 1, title: '无效' }, null] } } },
    { packageJSON: null },
  ]);

  assert.equal(titles.size, 0);
});

test('uses original text when a localized title is a localization key', () => {
  const titles = collectCommandTitles([
    { packageJSON: { contributes: { commands: [{ command: 'extension.reload', title: { value: '%command.reload%', original: 'Reload Window' } }] } } },
  ]);

  assert.equal(titles.get('extension.reload'), 'Reload Window');
});

test('uses the command ID when a localized title is unavailable', () => {
  const items = buildCommandQuickPickItems(
    ['extension.unknown', 'extension.known'],
    new Map([['extension.known', '已知命令']]),
  );

  assert.deepEqual(items, [
    {
      label: '命令：extension.known',
      detail: '描述：已知命令',
      commandId: 'extension.known',
    },
    {
      label: '命令：extension.unknown',
      detail: '描述：extension.unknown',
      commandId: 'extension.unknown',
    },
  ]);
});
