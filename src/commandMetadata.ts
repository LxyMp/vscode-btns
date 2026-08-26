export interface CommandMetadataSource {
  packageJSON?: unknown;
}

export interface CommandQuickPickItem {
  label: string;
  detail: string;
  commandId: string;
}

interface CommandContribution {
  command?: unknown;
  title?: unknown;
}

function getLocalizedText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.startsWith('%') && value.endsWith('%') ? undefined : value;
  }
  if (value !== null && typeof value === 'object') {
    const localizedValue = (value as { value?: unknown }).value;
    if (typeof localizedValue === 'string' && localizedValue.trim()) {
      if (!(localizedValue.startsWith('%') && localizedValue.endsWith('%'))) return localizedValue;
    }
    const original = (value as { original?: unknown }).original;
    if (typeof original === 'string' && original.trim()) return original;
  }
  return undefined;
}

export function collectCommandTitles(sources: readonly CommandMetadataSource[]): Map<string, string> {
  const titles = new Map<string, string>();

  for (const source of sources) {
    if (source.packageJSON === null || typeof source.packageJSON !== 'object') {
      continue;
    }
    const contributes = (source.packageJSON as { contributes?: unknown }).contributes;
    if (contributes === null || typeof contributes !== 'object') {
      continue;
    }
    const commands = (contributes as { commands?: unknown }).commands;
    if (!Array.isArray(commands)) {
      continue;
    }

    for (const contribution of commands as CommandContribution[]) {
      if (contribution === null || typeof contribution !== 'object') {
        continue;
      }
      if (typeof contribution.command !== 'string') {
        continue;
      }
      const title = getLocalizedText(contribution.title);
      if (title) {
        titles.set(contribution.command, title);
      }
    }
  }

  return titles;
}

export function buildCommandQuickPickItems(
  commandIds: readonly string[],
  titles: ReadonlyMap<string, string>,
): CommandQuickPickItem[] {
  return [...commandIds].sort().map((commandId) => ({
    label: `命令：${commandId}`,
    detail: `描述：${titles.get(commandId) || commandId}`,
    commandId,
  }));
}
