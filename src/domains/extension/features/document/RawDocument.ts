import type * as vscode from 'vscode';

// Just a placeholder for `CustomDocument` implementation
export class RawDocument implements vscode.CustomDocument {
  constructor(public readonly uri: vscode.Uri) {}

  public dispose(): void {}
}
