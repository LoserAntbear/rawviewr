import * as vscode from 'vscode';

export type FileSource = {
  id: string;
  name: string;
  uri: vscode.Uri;

  detail?: string;
};
