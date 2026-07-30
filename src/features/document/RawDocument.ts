import * as vscode from 'vscode';

// Just a placeholder for `CustomDocument` implementation
export class RawDocument implements vscode.CustomDocument {
  constructor(readonly uri: vscode.Uri) {}

  dispose(): void {}
}
