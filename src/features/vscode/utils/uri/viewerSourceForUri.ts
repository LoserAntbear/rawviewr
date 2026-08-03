import * as vscode from 'vscode';

import { ViewerSource } from '@features/viewer/viewer';

export function viewerSourceForUri(uri: vscode.Uri): ViewerSource {
  return {
    uri,
    id: uri.toString(),
    detail: vscode.workspace.asRelativePath(uri),
    name: uri.path.split('/').pop() || uri.toString(),
  };
}
