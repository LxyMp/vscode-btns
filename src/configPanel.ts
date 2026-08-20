import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  getConfiguredItemsForEditor,
  updateConfiguredItemsForEditor,
} from './config';
import { CustomActionItem } from './types';
import { validateAllItems } from './validation';

interface WebviewMessage {
  type?: unknown;
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

  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
  ) {
    this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'activity-icon.svg');
    this.panel.webview.html = getWebviewHtml(this.panel.webview, context.extensionUri);
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
      case 'save':
        await this.save(message.items);
        break;
    }
  }

  private async sendState(): Promise<void> {
    const rawItems = getConfiguredItemsForEditor();
    await this.panel.webview.postMessage({
      type: 'state',
      commandIds: await vscode.commands.getCommands(true),
      icons: readCodicons(),
      items: Array.isArray(rawItems) ? rawItems : [],
      rootError: Array.isArray(rawItems) ? undefined : 'customActions.items 不是数组',
    });
  }

  private async save(items: unknown): Promise<void> {
    const errors = validateAllItems(items);
    if (errors.length > 0) {
      await this.panel.webview.postMessage({ type: 'validationErrors', errors });
      return;
    }

    try {
      await updateConfiguredItemsForEditor(items as CustomActionItem[]);
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

function getNonce(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let index = 0; index < 32; index += 1) {
    nonce += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return nonce;
}

function readCodicons(): Array<{ name: string; character: string }> {
  const csvPath = path.join(__dirname, '..', 'resources', 'codicon.csv');
  try {
    const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).slice(1);
    return lines.flatMap((line) => {
      const [name, character] = line.split(',');
      return name && character ? [{ name, character }] : [];
    });
  } catch (error) {
    console.warn('[Custom Actions] 无法读取 Codicon 列表:', error);
    return [];
  }
}

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();
  const codiconFont = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'codicon.ttf'));
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>快捷动作配置</title>
  <style nonce="${nonce}">
    @font-face { font-family: codicon; src: url('${codiconFont}') format('truetype'); font-display: block; }
    .codicon { font: normal normal normal 16px/1 codicon; display: inline-flex; align-items: center; justify-content: center; }
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
    button, input, select, textarea { font: inherit; color: inherit; }
    button { cursor: pointer; }
    button:disabled { cursor: default; opacity: .45; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 8px 16px; background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-panel-border); }
    .toolbar-title { margin-right: auto; font-size: 15px; font-weight: 600; }
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
    .field input, .field textarea, .menu-select > button, .icon-picker > button { width: 100%; min-height: 30px; padding: 5px 7px; border: 1px solid var(--vscode-input-border, transparent); border-radius: 2px; outline: none; background: var(--vscode-input-background); color: var(--vscode-input-foreground); text-align: left; }
    .field textarea { min-height: 64px; resize: vertical; font-family: var(--vscode-editor-font-family); }
    .field input:focus, .field textarea:focus, .menu-select > button:focus, .icon-picker > button:focus { border-color: var(--vscode-focusBorder); }
    .menu-select, .icon-picker, .combo { position: relative; }
    .menu-select > button, .icon-picker > button { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
    .menu-select > button::after, .icon-picker > button::after, .combo::after { content: '⌄'; color: var(--vscode-descriptionForeground); position: absolute; right: 8px; top: 6px; pointer-events: none; }
    .menu, .icon-menu, .combo-menu { position: absolute; left: 0; right: 0; z-index: 20; max-height: 220px; overflow: auto; margin-top: 3px; padding: 4px; border: 1px solid var(--vscode-focusBorder); border-radius: 4px; background: var(--vscode-menu-background, var(--vscode-editor-background)); box-shadow: 0 6px 18px rgba(0,0,0,.28); }
    .menu button, .icon-menu button, .combo-menu button { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 28px; padding: 4px 7px; border: 0; background: transparent; color: var(--vscode-menu-foreground, var(--vscode-foreground)); text-align: left; }
    .menu button:hover, .icon-menu button:hover { background: var(--vscode-list-hoverBackground); }
    .icon-preview { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 3px; background: var(--vscode-button-secondaryBackground); }
    .icon-check { display: inline-flex; align-items: center; justify-content: center; width: 18px; flex: 0 0 18px; color: var(--vscode-testing-iconPassed); font-weight: 700; }
    .icon-search { position: sticky; top: 0; z-index: 1; margin-bottom: 4px; }
    .menu-select .menu.hidden, .icon-picker .icon-menu.hidden, .combo-menu.hidden { display: none; }
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
    <button id="add" class="command secondary" type="button">新增动作</button>
    <button id="save" class="command" type="button">保存</button>
  </header>
  <main>
    <div id="status" class="status"></div>
    <div id="actions"></div>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = { items: [], commandIds: [], icons: [], dirty: false, errors: [] };
    const actionsElement = document.getElementById('actions');
    const statusElement = document.getElementById('status');
    const saveButton = document.getElementById('save');
    document.getElementById('add').addEventListener('click', addItem);
    saveButton.addEventListener('click', save);
    document.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.menu-select, .icon-picker, .combo')) closeMenus();
    });
    document.addEventListener('focusin', (event) => {
      if (!event.target.closest('.menu-select, .icon-picker, .combo')) closeMenus();
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'state') {
        state.commandIds = Array.isArray(message.commandIds) ? message.commandIds : [];
        state.icons = Array.isArray(message.icons) ? message.icons : [];
        state.items = normalizeItems(message.items);
        state.dirty = false;
        state.errors = [];
        render();
        setStatus(message.rootError || '');
      } else if (message.type === 'validationErrors') {
        state.errors = message.errors || [];
        render();
        setStatus('请修正配置错误后再保存', true);
        requestAnimationFrame(() => {
          const invalid = document.querySelector('.action.invalid');
          invalid?.scrollIntoView({ block: 'start', behavior: 'smooth' });
          if (invalid) window.scrollBy({ top: -64, behavior: 'smooth' });
        });
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
          group: stringValue(item && item.group), description: stringValue(item && item.description), icon: stringValue(item && item.icon),
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

    function addItem() {
      let suffix = state.items.length + 1;
      let id = '新动作';
      while (state.items.some((item) => item.id === id)) { id = '新动作 ' + suffix++; }
      state.items.push({ id, label: id, group: '', description: '', icon: '', action: { type: 'command', command: '', url: '', argsText: '[]', cwd: '\${workspaceFolder}', terminalName: '', reuse: true, reveal: true } });
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
      vscode.postMessage({ type: 'save', items: result.items });
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
        const output = compact({ id: item.id.trim(), label: item.label.trim(), group: item.group.trim(), description: item.description.trim(), icon: item.icon.trim(), action: {} });
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
        actionsElement.innerHTML = '<div class="empty">当前没有快捷动作</div>';
        return;
      }
      actionsElement.innerHTML = state.items.map(renderItem).join('');
      bindItemEvents();
    }

    function renderToolbar() {
      saveButton.disabled = !state.dirty;
      saveButton.textContent = state.dirty ? '保存' : '已保存';
    }

    function renderItem(item, index) {
      const itemErrors = state.errors.filter((entry) => entry.itemId === item.id || (entry.itemId === 'unknown' && !item.id));
      const errorHtml = itemErrors.length ? '<div class="errors">' + itemErrors.map((entry) => escapeHtml('[' + entry.field + '] ' + entry.message)).join('<br>') + '</div>' : '';
      return '<section class="action ' + (itemErrors.length ? 'invalid' : '') + '" data-index="' + index + '">' +
        '<div class="action-header"><span class="action-index">' + (index + 1) + '</span><span class="action-name">' + escapeHtml(item.label || item.id || '未命名动作') + '</span>' +
        iconButton('↑', '上移', 'up', index === 0) + iconButton('↓', '下移', 'down', index === state.items.length - 1) + iconButton('×', '删除', 'delete', false) + '</div>' +
        '<div class="action-body">' + field('名称', 'label', item.label) + field('ID', 'id', item.id) + menuSelect('行为', 'action.type', item.action.type, [{ value: 'command', label: 'VS Code 命令' }, { value: 'terminal', label: '终端命令' }, { value: 'url', label: '打开 URL' }]) + commandField(item) + comboField('分组', 'group', item.group, groupOptions(item.group).map((option) => option.value)) + iconPicker(item.icon) + field('描述', 'description', item.description) +
        actionFields(item) + errorHtml + '</div></section>';
    }

    function actionFields(item) {
      if (item.action.type === 'command') return textarea('参数（JSON 数组）', 'action.argsText', item.action.argsText);
      if (item.action.type === 'terminal') return field('工作目录', 'action.cwd', item.action.cwd) + field('终端名称', 'action.terminalName', item.action.terminalName) + '<div class="field"><label>终端行为</label><div class="checks"><label><input type="checkbox" data-field="action.reuse"' + checked(item.action.reuse) + '>复用终端</label><label><input type="checkbox" data-field="action.reveal"' + checked(item.action.reveal) + '>显示终端</label></div></div>';
      return '';
    }

    function commandField(item) {
      if (item.action.type === 'command') {
        const commandOptions = [...new Set([...state.commandIds.slice().sort().slice(0, 300), item.action.command])];
        return comboField('命令 ID', 'action.command', item.action.command, commandOptions);
      }
      if (item.action.type === 'terminal') return field('终端命令', 'action.command', item.action.command, false);
      return field('URL', 'action.url', item.action.url, false);
    }

    function field(label, name, value, full) { return '<div class="field ' + (full ? 'full' : '') + '"><label>' + label + '</label><input data-field="' + name + '" value="' + escapeAttr(value) + '"></div>'; }
    function textarea(label, name, value) { return '<div class="field full"><label>' + label + '</label><textarea data-field="' + name + '">' + escapeHtml(value) + '</textarea></div>'; }
    function iconButton(symbol, title, action, disabled) { return '<button class="icon-button" type="button" data-action="' + action + '" title="' + title + '"' + (disabled ? ' disabled' : '') + '>' + symbol + '</button>'; }
    function checked(value) { return value ? ' checked' : ''; }
    function groupOptions(current) { const values = [...new Set(state.items.map((item) => item.group).filter(Boolean))]; if (current && !values.includes(current)) values.unshift(current); return [{ value: '', label: '无分组' }, ...values.map((value) => ({ value, label: value }))]; }
    function comboField(label, name, value, options) { const available = options.filter(Boolean); if (!available.length) return field(label, name, value, false); return '<div class="field"><label>' + label + '</label><div class="combo"><input data-field="' + name + '" value="' + escapeAttr(value) + '"><div class="combo-menu hidden">' + available.map((option) => '<button type="button" data-value="' + escapeAttr(option) + '">' + escapeHtml(option) + '</button>').join('') + '</div></div></div>'; }
    function menuSelect(label, name, value, options) { return '<div class="field"><label>' + label + '</label><div class="menu-select" data-select="' + name + '"><button type="button">' + escapeHtml(options.find((option) => option.value === value)?.label || value) + '</button><div class="menu hidden">' + options.map((option) => '<button type="button" data-value="' + escapeAttr(option.value) + '">' + escapeHtml(option.label) + '</button>').join('') + '</div></div></div>'; }
    function iconPicker(value) { const current = state.icons.find((icon) => icon.name === value) || { name: value, character: value ? '◇' : '·' }; return '<div class="field"><label>图标</label><div class="icon-picker" data-select="icon"><button type="button"><span><span class="icon-preview codicon">' + current.character + '</span> ' + escapeHtml(current.name || '无图标') + '</span></button><div class="icon-menu hidden"></div></div></div>'; }
    function populateIconMenu(menu, currentValue, index) { const icons = [{ name: '', character: '·' }, ...state.icons]; menu.innerHTML = '<input class="icon-search" placeholder="搜索图标..."><div class="icon-options">' + icons.map((icon) => '<button type="button" data-value="' + escapeAttr(icon.name) + '"><span class="icon-check">' + (icon.name === currentValue ? '✓' : '') + '</span><span class="icon-preview codicon">' + icon.character + '</span><span>' + escapeHtml(icon.name || '无图标') + '</span></button>').join('') + '</div>'; const search = menu.querySelector('.icon-search'); search.addEventListener('input', () => menu.querySelectorAll('[data-value]').forEach((option) => option.classList.toggle('hidden', !option.dataset.value.includes(search.value.toLowerCase())))); menu.querySelectorAll('[data-value]').forEach((option) => option.addEventListener('click', () => { state.items[index].icon = option.dataset.value; state.errors = []; markDirty(); render(); })); }
    function closeMenus() { document.querySelectorAll('.menu, .icon-menu, .combo-menu').forEach((menu) => menu.classList.add('hidden')); }

    function bindItemEvents() {
      document.querySelectorAll('.action').forEach((element) => {
        const index = Number(element.dataset.index);
        element.querySelectorAll('[data-field]').forEach((input) => {
          input.addEventListener('input', () => updateField(index, input));
          input.addEventListener('change', () => updateField(index, input));
        });
        element.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => applyAction(index, button.dataset.action)));
        element.querySelectorAll('[data-select]').forEach((select) => {
          const trigger = select.querySelector(':scope > button');
          const menu = select.querySelector(':scope > .menu, :scope > .icon-menu');
          trigger.addEventListener('click', () => { const opening = menu.classList.contains('hidden'); closeMenus(); if (opening) { if (select.dataset.select === 'icon' && !menu.childElementCount) populateIconMenu(menu, state.items[index].icon, index); menu.classList.remove('hidden'); } });
          menu.querySelectorAll('[data-value]').forEach((option) => option.addEventListener('click', () => {
            const value = option.dataset.value;
            const fieldName = select.dataset.select;
            if (fieldName === 'icon') state.items[index].icon = value;
            else if (fieldName === 'group') state.items[index].group = value;
            else state.items[index].action.type = value;
            state.errors = [];
            markDirty();
            render();
          }));
        });
        element.querySelectorAll('.combo').forEach((combo) => {
          const input = combo.querySelector('input[data-field]');
          const menu = combo.querySelector('.combo-menu');
          input.addEventListener('focus', () => { closeMenus(); menu.classList.remove('hidden'); });
          input.addEventListener('input', () => {
            menu.classList.remove('hidden');
            menu.querySelectorAll('[data-value]').forEach((option) => {
              option.classList.toggle('hidden', !option.dataset.value.toLowerCase().includes(input.value.toLowerCase()));
            });
          });
          menu.querySelectorAll('[data-value]').forEach((option) => option.addEventListener('click', () => {
            input.value = option.dataset.value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            menu.classList.add('hidden');
          }));
        });
      });
    }

    function updateField(index, input) {
      const path = input.dataset.field.split('.');
      const value = input.type === 'checkbox' ? input.checked : input.value;
      const previousLabel = state.items[index].label;
      if (path.length === 1) state.items[index][path[0]] = value;
      else state.items[index][path[0]][path[1]] = value;
      state.errors = [];
      markDirty();
      if (input.dataset.field === 'label' && (!state.items[index].id || state.items[index].id === previousLabel)) {
        state.items[index].id = value;
        input.closest('.action').querySelector('[data-field="id"]').value = state.items[index].id;
      }
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
