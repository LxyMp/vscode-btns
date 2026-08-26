import * as vscode from 'vscode';
import {
  containsVariable,
  resolveObjectVariables,
  resolveVariablesWithContext,
  VariableContext,
} from './variableResolver';

/**
 * 替换字符串中的变量
 *
 * 支持的变量：
 * - ${workspaceFolder} - 当前第一个工作区目录
 * - ${file} - 当前活动文件完整路径
 * - ${fileDirname} - 当前活动文件所在目录
 * - ${fileBasename} - 当前活动文件名（包含扩展名）
 * - ${fileBasenameNoExtension} - 当前活动文件名（不包含扩展名）
 * - ${fileExtname} - 当前活动文件扩展名
 * - ${selectedText} - 当前选中文本
 * - ${env:NAME} - 环境变量
 */
export function resolveVariables(input: string): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder && input.includes('${workspaceFolder}')) {
    vscode.window.showWarningMessage('当前没有打开工作区，无法解析 ${workspaceFolder}');
  }
  const editor = vscode.window.activeTextEditor;
  return resolveVariablesWithContext(input, {
    workspaceFolder,
    file: editor?.document.uri.fsPath,
    selectedText: editor?.document.getText(editor.selection),
    env: process.env,
  });
}

/**
 * 对动作对象中的所有字符串字段进行变量替换
 */
export function resolveActionVariables<T>(obj: T): T {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder && containsVariable(obj, '${workspaceFolder}')) {
    vscode.window.showWarningMessage('当前没有打开工作区，无法解析 ${workspaceFolder}');
  }
  const editor = vscode.window.activeTextEditor;
  const context: VariableContext = {
    workspaceFolder,
    file: editor?.document.uri.fsPath,
    selectedText: editor?.document.getText(editor.selection),
    env: process.env,
  };
  return resolveObjectVariables(obj, context);
}
