import * as path from 'node:path';

export interface VariableContext {
  workspaceFolder?: string;
  file?: string;
  selectedText?: string;
  env?: NodeJS.ProcessEnv;
}

export function containsVariable(value: unknown, variable: string): boolean {
  if (typeof value === 'string') {
    return value.includes(variable);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsVariable(item, variable));
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((item) => containsVariable(item, variable));
  }
  return false;
}

export function resolveVariablesWithContext(input: string, context: VariableContext): string {
  if (!input) {
    return input;
  }

  const file = context.file ?? '';
  const fileBasename = file ? path.basename(file) : '';
  const fileExtname = file ? path.extname(file) : '';
  const fileBasenameNoExtension = fileBasename.slice(0, fileBasename.length - fileExtname.length);

  return input
    .replace(/\$\{workspaceFolder\}/g, context.workspaceFolder ?? '')
    .replace(/\$\{file\}/g, file)
    .replace(/\$\{fileDirname\}/g, file ? path.dirname(file) : '')
    .replace(/\$\{fileBasename\}/g, fileBasename)
    .replace(/\$\{fileBasenameNoExtension\}/g, fileBasenameNoExtension)
    .replace(/\$\{fileExtname\}/g, fileExtname)
    .replace(/\$\{selectedText\}/g, context.selectedText ?? '')
    .replace(/\$\{env:([^}]+)\}/g, (_match, name: string) => context.env?.[name] ?? '');
}

export function resolveObjectVariables<T>(value: T, context: VariableContext): T {
  if (typeof value === 'string') {
    return resolveVariablesWithContext(value, context) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveObjectVariables(item, context)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveObjectVariables(item, context)]),
    ) as T;
  }
  return value;
}
