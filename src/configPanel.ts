import * as vscode from 'vscode';
import {
  ConfigurationScope,
  getConfiguredItemsForScope,
  getPreferredConfigurationScope,
  updateConfiguredItemsForScope,
} from './config';
import { CustomActionItem } from './types';
import { validateAllItems } from './validation';

interface WebviewMessage {
  type?: unknown;
  scope?: unknown;
  items?: unknown;
}

export class ConfigPanel implements vscode.Disposable {
  private static current: ConfigPanel | undefined;

  static show(context: vscode.ExtensionContext): void {
    if (ConfigPanel.current) {
      ConfigPanel.current.panel.reveal(vscode.ViewColumn.One);
      ConfigPanel.current.sendState();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'customActions.configEditor',
      '快捷动作配置',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    ConfigPanel.current = new ConfigPanel(panel, context);
  }

  private scope: ConfigurationScope = getPreferredConfigurationScope();
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
  ) {
    this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'activity-icon.svg');
    this.panel.webview.html = getWebviewHtml(this.panel.webview);
    this.disposables.push(
      this.panel.onDidDispose(() => this.dispose()),
      this.panel.webview.onDidReceiveMessage((message: WebviewMessage) => this.handleMessage(message)),
    );
  }

  dispose(): void {
    if (ConfigPanel.current !== this) {
      return;
    }
    ConfigPanel.current = undefined;
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this.sendState();
        break;
      case 'selectScope':
        if (message.scope === 'user' || message.scope === 'workspace') {
          if (message.scope === 'workspace' && !hasWorkspace()) {
            return;
          }
          this.scope = message.scope;
          await this.sendState();
        }
        break;
      case 'save':
        await this.save(message.scope, message.items);
        break;
    }
  }

  private async sendState(): Promise<void> {
    const rawItems = getConfiguredItemsForScope(this.scope);
    await this.panel.webview.postMessage({
      type: 'state',
      scope: this.scope,
      workspaceAvailable: hasWorkspace(),
      items: Array.isArray(rawItems) ? rawItems : [],
      rootError: Array.isArray(rawItems) ? undefined : '当前范围的 customActions.items 不是数组',
    });
  }

  private async save(scope: unknown, items: unknown): Promise<void> {
    if (scope !== 'user' && scope !== 'workspace') {
      return;
    }
    if (scope === 'workspace' && !hasWorkspace()) {
      await this.postSaveError('当前没有打开工作区，无法保存工作区配置');
      return;
    }

    const errors = validateAllItems(items);
    if (errors.length > 0) {
      await this.panel.webview.postMessage({ type: 'validationErrors', errors });
      return;
    }

    try {
      await updateConfiguredItemsForScope(scope, items as CustomActionItem[]);
      this.scope = scope;
      await this.panel.webview.postMessage({ type: 'saved' });
      vscode.window.showInformationMessage('快捷动作配置已保存');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.postSaveError(`保存失败：${message}`);
    }
  }

  private async postSaveError(message: string): Promise<void> {
    await this.panel.webview.postMessage({ type: 'saveError', message });
    vscode.window.showErrorMessage(message);
  }
}

function hasWorkspace(): boolean {
  return Boolean(vscode.workspace.workspaceFolders?.length);
}

function getNonce(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let index = 0; index < 32; index += 1) {
    nonce += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return nonce;
}

function getWebviewHtml(webview: vscode.Webview): string {
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>快捷动作配置</title>
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
    button, input, select, textarea { font: inherit; color: inherit; }
    button { cursor: pointer; }
    button:disabled { cursor: default; opacity: .45; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 8px 16px; background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-panel-border); }
    .toolbar-title { margin-right: auto; font-size: 15px; font-weight: 600; }
    .scope { display: flex; border: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); border-radius: 4px; overflow: hidden; }
    .scope button { min-width: 76px; min-height: 30px; border: 0; border-right: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .scope button:last-child { border-right: 0; }
    .scope button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .command { min-height: 30px; padding: 0 12px; border: 1px solid var(--vscode-button-border, transparent); border-radius: 4px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .command.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .icon-button { width: 30px; height: 30px; padding: 0; border: 1px solid var(--vscode-button-border, var(--vscode-panel-border)); border-radius: 4px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); font-size: 16px; }
    main { width: min(980px, 100%); margin: 0 auto; padding: 16px 16px 80px; }
    .status { min-height: 28px; margin-bottom: 8px; color: var(--vscode-descriptionForeground); }
    .status.error { color: var(--vscode-errorForeground); }
    .empty { padding: 48px 16px; text-align: center; border: 1px dashed var(--vscode-panel-border); color: var(--vscode-descriptionForeground); }
    .action { margin-bottom: 12px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; background: var(--vscode-sideBar-background); }
    .action.invalid { border-color: var(--vscode-inputValidation-errorBorder); }
    .action-header { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 6px 10px; border-bottom: 1px solid var(--vscode-panel-border); }
    .action-index { min-width: 26px; color: var(--vscode-descriptionForeground); font-variant-numeric: tabular-nums; }
    .action-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .action-body { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; padding: 14px; }
    .field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .field.full { grid-column: 1 / -1; }
    .field label { color: var(--vscode-descriptionForeground); font-size: 12px; }
    .field input, .field select, .field textarea { width: 100%; min-height: 30px; padding: 5px 7px; border: 1px solid var(--vscode-input-border, transparent); border-radius: 2px; outline: none; background: var(--vscode-input-background); color: var(--vscode-input-foreground); }
    .field textarea { min-height: 64px; resize: vertical; font-family: var(--vscode-editor-font-family); }
    .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--vscode-focusBorder); }
    .checks { display: flex; align-items: center; gap: 18px; min-height: 30px; }
    .checks label { display: inline-flex; align-items: center; gap: 6px; color: var(--vscode-foreground); }
    .errors { grid-column: 1 / -1; margin: 0; padding: 8px 10px; background: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); color: var(--vscode-inputValidation-errorForeground); }
    .hidden { display: none !important; }
    @media (max-width: 680px) { .toolbar { flex-wrap: wrap; } .toolbar-title { width: 100%; } .action-body { grid-template-columns: 1fr; } .field.full { grid-column: 1; } }
  </style>
</head>
<body>
  <header class="toolbar">
    <div class="toolbar-title">快捷动作配置</div>
    <div class="scope" aria-label="配置范围">
      <button id="scope-user" type="button">用户</button>
      <button id="scope-workspace" type="button">工作区</button>
    </div>
    <button id="add" class="command secondary" type="button">新增动作</button>
    <button id="save" class="command" type="button">保存</button>
  </header>
  <main>
    <div id="status" class="status"></div>
    <div id="actions"></div>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = { scope: 'user', workspaceAvailable: false, items: [], dirty: false, errors: [] };
    const actionsElement = document.getElementById('actions');
    const statusElement = document.getElementById('status');
    const saveButton = document.getElementById('save');
    const workspaceButton = document.getElementById('scope-workspace');

    document.getElementById('scope-user').addEventListener('click', () => selectScope('user'));
    workspaceButton.addEventListener('click', () => selectScope('workspace'));
    document.getElementById('add').addEventListener('click', addItem);
    saveButton.addEventListener('click', save);

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'state') {
        state.scope = message.scope;
        state.workspaceAvailable = message.workspaceAvailable;
        state.items = normalizeItems(message.items);
        state.dirty = false;
        state.errors = [];
        render();
        setStatus(message.rootError || '');
      } else if (message.type === 'validationErrors') {
        state.errors = message.errors || [];
        render();
        setStatus('请修正配置错误后再保存', true);
      } else if (message.type === 'saved') {
        state.dirty = false;
        state.errors = [];
        renderToolbar();
        setStatus('已保存');
      } else if (message.type === 'saveError') {
        setStatus(message.message, true);
      }
    });

    function normalizeItems(items) {
      if (!Array.isArray(items)) return [];
      return items.map((item) => {
        const action = item && typeof item.action === 'object' ? item.action : {};
        return {
          id: stringValue(item && item.id), label: stringValue(item && item.label),
          group: stringValue(item && item.group), description: stringValue(item && item.description),
          tooltip: stringValue(item && item.tooltip), icon: stringValue(item && item.icon),
          action: {
            type: ['command', 'terminal', 'url'].includes(action.type) ? action.type : 'command',
            command: stringValue(action.command), url: stringValue(action.url),
            argsText: JSON.stringify(Array.isArray(action.args) ? action.args : [], null, 2),
            cwd: stringValue(action.cwd), terminalName: stringValue(action.terminalName),
            reuse: action.reuse !== false, reveal: action.reveal !== false
          }
        };
      });
    }

    function stringValue(value) { return typeof value === 'string' ? value : ''; }

    function selectScope(scope) {
      if (scope === state.scope || (scope === 'workspace' && !state.workspaceAvailable)) return;
      if (state.dirty && !confirm('当前修改尚未保存，确定切换配置范围吗？')) return;
      vscode.postMessage({ type: 'selectScope', scope });
    }

    function addItem() {
      let suffix = state.items.length + 1;
      let id = 'action-' + suffix;
      while (state.items.some((item) => item.id === id)) { suffix += 1; id = 'action-' + suffix; }
      state.items.push({ id, label: '新动作', group: '', description: '', tooltip: '', icon: '', action: { type: 'command', command: '', url: '', argsText: '[]', cwd: '\${workspaceFolder}', terminalName: '', reuse: true, reveal: true } });
      markDirty();
      render();
      document.querySelector('[data-index="' + (state.items.length - 1) + '"] input[data-field="label"]')?.focus();
    }

    function save() {
      const result = serializeItems();
      if (result.errors.length) {
        state.errors = result.errors;
        render();
        setStatus('请修正配置错误后再保存', true);
        return;
      }
      saveButton.disabled = true;
      setStatus('正在保存...');
      vscode.postMessage({ type: 'save', scope: state.scope, items: result.items });
    }

    function serializeItems() {
      const errors = [];
      const ids = new Set();
      const items = state.items.map((item, index) => {
        const itemId = item.id.trim() || 'unknown-' + index;
        if (!item.id.trim()) errors.push(error(itemId, 'id', 'id 必须是非空字符串'));
        if (ids.has(item.id.trim())) errors.push(error(itemId, 'id', 'id 重复'));
        ids.add(item.id.trim());
        if (!item.label.trim()) errors.push(error(itemId, 'label', 'label 必须是非空字符串'));
        const output = compact({ id: item.id.trim(), label: item.label.trim(), group: item.group.trim(), description: item.description.trim(), tooltip: item.tooltip.trim(), icon: item.icon.trim(), action: {} });
        if (item.action.type === 'command') {
          if (!item.action.command.trim()) errors.push(error(itemId, 'action.command', 'command 必须是非空字符串'));
          let args = [];
          try { args = JSON.parse(item.action.argsText || '[]'); if (!Array.isArray(args)) throw new Error(); }
          catch { errors.push(error(itemId, 'action.args', '参数必须是 JSON 数组')); }
          output.action = { type: 'command', command: item.action.command.trim(), args };
        } else if (item.action.type === 'terminal') {
          if (!item.action.command.trim()) errors.push(error(itemId, 'action.command', 'command 必须是非空字符串'));
          output.action = compact({ type: 'terminal', command: item.action.command, cwd: item.action.cwd.trim(), terminalName: item.action.terminalName.trim(), reuse: item.action.reuse, reveal: item.action.reveal });
        } else {
          if (!item.action.url.trim()) errors.push(error(itemId, 'action.url', 'url 必须是非空字符串'));
          output.action = { type: 'url', url: item.action.url.trim() };
        }
        return output;
      });
      return { items, errors };
    }

    function compact(value) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '')); }
    function error(itemId, field, message) { return { itemId, field, message }; }

    function render() {
      renderToolbar();
      if (!state.items.length) {
        actionsElement.innerHTML = '<div class="empty">当前范围没有快捷动作</div>';
        return;
      }
      actionsElement.innerHTML = state.items.map(renderItem).join('');
      bindItemEvents();
    }

    function renderToolbar() {
      document.getElementById('scope-user').classList.toggle('active', state.scope === 'user');
      workspaceButton.classList.toggle('active', state.scope === 'workspace');
      workspaceButton.disabled = !state.workspaceAvailable;
      saveButton.disabled = !state.dirty;
      saveButton.textContent = state.dirty ? '保存' : '已保存';
    }

    function renderItem(item, index) {
      const itemErrors = state.errors.filter((entry) => entry.itemId === item.id || (entry.itemId === 'unknown' && !item.id));
      const errorHtml = itemErrors.length ? '<div class="errors">' + itemErrors.map((entry) => escapeHtml('[' + entry.field + '] ' + entry.message)).join('<br>') + '</div>' : '';
      return '<section class="action ' + (itemErrors.length ? 'invalid' : '') + '" data-index="' + index + '">' +
        '<div class="action-header"><span class="action-index">' + (index + 1) + '</span><span class="action-name">' + escapeHtml(item.label || item.id || '未命名动作') + '</span>' +
        iconButton('↑', '上移', 'up', index === 0) + iconButton('↓', '下移', 'down', index === state.items.length - 1) + iconButton('×', '删除', 'delete', false) + '</div>' +
        '<div class="action-body">' + field('ID', 'id', item.id) + field('名称', 'label', item.label) + field('分组', 'group', item.group) + field('图标 Codicon', 'icon', item.icon) +
        field('描述', 'description', item.description) + field('悬浮提示', 'tooltip', item.tooltip) +
        '<div class="field"><label>动作类型</label><select data-field="action.type"><option value="command"' + selected(item.action.type, 'command') + '>VS Code 命令</option><option value="terminal"' + selected(item.action.type, 'terminal') + '>终端命令</option><option value="url"' + selected(item.action.type, 'url') + '>打开 URL</option></select></div>' +
        actionFields(item) + errorHtml + '</div></section>';
    }

    function actionFields(item) {
      if (item.action.type === 'command') return field('命令 ID', 'action.command', item.action.command, true) + textarea('参数（JSON 数组）', 'action.argsText', item.action.argsText);
      if (item.action.type === 'terminal') return field('终端命令', 'action.command', item.action.command, true) + field('工作目录', 'action.cwd', item.action.cwd) + field('终端名称', 'action.terminalName', item.action.terminalName) + '<div class="field"><label>终端行为</label><div class="checks"><label><input type="checkbox" data-field="action.reuse"' + checked(item.action.reuse) + '>复用终端</label><label><input type="checkbox" data-field="action.reveal"' + checked(item.action.reveal) + '>显示终端</label></div></div>';
      return field('URL', 'action.url', item.action.url, true);
    }

    function field(label, name, value, full) { return '<div class="field ' + (full ? 'full' : '') + '"><label>' + label + '</label><input data-field="' + name + '" value="' + escapeAttr(value) + '"></div>'; }
    function textarea(label, name, value) { return '<div class="field full"><label>' + label + '</label><textarea data-field="' + name + '">' + escapeHtml(value) + '</textarea></div>'; }
    function iconButton(symbol, title, action, disabled) { return '<button class="icon-button" type="button" data-action="' + action + '" title="' + title + '"' + (disabled ? ' disabled' : '') + '>' + symbol + '</button>'; }
    function selected(current, value) { return current === value ? ' selected' : ''; }
    function checked(value) { return value ? ' checked' : ''; }

    function bindItemEvents() {
      document.querySelectorAll('.action').forEach((element) => {
        const index = Number(element.dataset.index);
        element.querySelectorAll('[data-field]').forEach((input) => {
          input.addEventListener('input', () => updateField(index, input));
          input.addEventListener('change', () => updateField(index, input));
        });
        element.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => applyAction(index, button.dataset.action)));
      });
    }

    function updateField(index, input) {
      const path = input.dataset.field.split('.');
      const value = input.type === 'checkbox' ? input.checked : input.value;
      if (path.length === 1) state.items[index][path[0]] = value;
      else state.items[index][path[0]][path[1]] = value;
      state.errors = [];
      markDirty();
      if (input.dataset.field === 'label') input.closest('.action').querySelector('.action-name').textContent = value || state.items[index].id || '未命名动作';
      if (input.dataset.field === 'action.type') render();
    }

    function applyAction(index, action) {
      if (action === 'delete') {
        if (!confirm('确定删除“' + (state.items[index].label || state.items[index].id) + '”吗？')) return;
        state.items.splice(index, 1);
      } else if (action === 'up' && index > 0) {
        [state.items[index - 1], state.items[index]] = [state.items[index], state.items[index - 1]];
      } else if (action === 'down' && index < state.items.length - 1) {
        [state.items[index + 1], state.items[index]] = [state.items[index], state.items[index + 1]];
      }
      markDirty(); render();
    }

    function markDirty() { state.dirty = true; renderToolbar(); setStatus('有未保存的修改'); }
    function setStatus(message, isError) { statusElement.textContent = message; statusElement.classList.toggle('error', Boolean(isError)); saveButton.disabled = !state.dirty; }
    function escapeHtml(value) { return String(value).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]); }
    function escapeAttr(value) { return escapeHtml(value).replace(/"/g, '&quot;'); }

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}
