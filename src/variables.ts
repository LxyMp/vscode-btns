import * as vscode from 'vscode';

/**
 * 替换字符串中的变量
 *
 * 支持的变量：
 * - ${workspaceFolder} - 当前第一个工作区目录
 * - ${file} - 当前活动文件完整路径
 * - ${fileDirname} - 当前活动文件所在目录
 * - ${fileBasename} - 当前活动文件名
 * - ${fileExtname} - 当前活动文件扩展名
 * - ${selectedText} - 当前选中文本
 * - ${env:NAME} - 环境变量
 */
export function resolveVariables(input: string): string {
  if (!input) {
    return input;
  }

  let result = input;

  // ${workspaceFolder}
  result = result.replace(/\$\{workspaceFolder\}/g, () => {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return folders[0].uri.fsPath;
    }
    vscode.window.showWarningMessage('当前没有打开工作区，无法解析 ${workspaceFolder}');
    return '';
  });

  // ${file}, ${fileDirname}, ${fileBasename}, ${fileExtname}
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const filePath = editor.document.uri.fsPath;
    const parts = filePath.split(/[\\/]/);
    const fileName = parts[parts.length - 1] || '';
    const dotIndex = fileName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
    const extName = dotIndex > 0 ? fileName.substring(dotIndex) : '';
    const dirName = parts.slice(0, -1).join('/');

    result = result.replace(/\$\{file\}/g, filePath);
    result = result.replace(/\$\{fileDirname\}/g, dirName);
    result = result.replace(/\$\{fileBasename\}/g, baseName);
    result = result.replace(/\$\{fileExtname\}/g, extName);
  } else {
    // 无活动编辑器时，将文件相关变量替换为空字符串
    result = result.replace(/\$\{file\}/g, '');
    result = result.replace(/\$\{fileDirname\}/g, '');
    result = result.replace(/\$\{fileBasename\}/g, '');
    result = result.replace(/\$\{fileExtname\}/g, '');
  }

  // ${selectedText}
  if (editor && editor.selection) {
    const selectedText = editor.document.getText(editor.selection);
    result = result.replace(/\$\{selectedText\}/g, selectedText);
  } else {
    result = result.replace(/\$\{selectedText\}/g, '');
  }

  // ${env:NAME}
  result = result.replace(/\$\{env:(\w+)\}/g, (_match, name) => {
    return process.env[name] || '';
  });

  return result;
}

/**
 * 对动作对象中的所有字符串字段进行变量替换
 */
export function resolveActionVariables<T>(obj: T): T {
  if (typeof obj === 'string') {
    return resolveVariables(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveActionVariables(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      resolved[key] = resolveActionVariables(value);
    }
    return resolved as T;
  }
  return obj;
}
