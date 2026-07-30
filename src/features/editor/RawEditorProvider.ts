import * as vscode from 'vscode';
import { RawDocument } from '../document/RawDocument.js';
import { Viewer, sourceFor } from '../../viewer.js';
import { register } from '../../viewerRegistry.js';

export class RawEditorProvider implements vscode.CustomReadonlyEditorProvider<RawDocument> {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public openCustomDocument(uri: vscode.Uri): RawDocument {
    return new RawDocument(uri);
  }

  public resolveCustomEditor(document: RawDocument, panel: vscode.WebviewPanel): void {
    register(
      panel,
      new Viewer(
        this.context,
        panel.webview,
        'single',
        document.uri.toString(),
        [
          sourceFor(document.uri),
        ]),
    );
  }
}
