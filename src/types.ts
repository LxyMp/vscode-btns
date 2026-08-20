/**
 * 动作类型枚举
 */
export enum ActionType {
  Command = 'command',
  Terminal = 'terminal',
  Url = 'url',
}

/**
 * VS Code 命令动作
 */
export interface CommandAction {
  type: ActionType.Command;
  command: string;
}

/**
 * 终端命令动作
 */
export interface TerminalAction {
  type: ActionType.Terminal;
  command: string;
  cwd?: string;
  terminalName?: string;
  reuse?: boolean;
  reveal?: boolean;
}

/**
 * URL 动作
 */
export interface UrlAction {
  type: ActionType.Url;
  url: string;
}

/**
 * 动作联合类型
 */
export type CustomAction = CommandAction | TerminalAction | UrlAction;

/**
 * 自定义动作项
 */
export interface CustomActionItem {
  id: string;
  label: string;
  group?: string;
  icon?: string;
  action: CustomAction;
}

/**
 * 配置校验错误
 */
export interface ValidationError {
  itemId: string;
  field: string;
  message: string;
}
