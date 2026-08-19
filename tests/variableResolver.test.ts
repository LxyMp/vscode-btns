import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveObjectVariables, resolveVariablesWithContext } from '../src/variableResolver';

const context = {
  workspaceFolder: '/workspace/project',
  file: '/workspace/project/src/index.test.ts',
  selectedText: 'selected',
  env: { CUSTOM_VALUE: 'environment' },
};

test('resolves file variables with VS Code-compatible basename semantics', () => {
  const result = resolveVariablesWithContext(
    '${fileBasename}|${fileBasenameNoExtension}|${fileExtname}|${fileDirname}',
    context,
  );

  assert.equal(result, 'index.test.ts|index.test|.ts|/workspace/project/src');
});

test('resolves workspace, selection, and environment variables', () => {
  assert.equal(
    resolveVariablesWithContext('${workspaceFolder}:${selectedText}:${env:CUSTOM_VALUE}', context),
    '/workspace/project:selected:environment',
  );
});

test('recursively resolves strings without mutating the source object', () => {
  const source = { command: 'node ${file}', args: ['${selectedText}'], enabled: true };
  const result = resolveObjectVariables(source, context);

  assert.deepEqual(result, {
    command: 'node /workspace/project/src/index.test.ts',
    args: ['selected'],
    enabled: true,
  });
  assert.equal(source.command, 'node ${file}');
});
