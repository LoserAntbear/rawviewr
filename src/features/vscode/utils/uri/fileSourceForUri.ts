import * as vscode from 'vscode';

import { FileSource } from '@features/webview/types';

export function fileSourceForUri(uri: vscode.Uri): FileSource {
  return {
    uri,
    id: uri.toString(),
    detail: vscode.workspace.asRelativePath(uri),
    name: uri.path.split('/').pop() || uri.toString(),
  };
}
