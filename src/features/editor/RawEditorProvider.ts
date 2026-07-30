import * as vscode from 'vscode';
import { RawDocument } from '../document/RawDocument.js';
import { Viewer } from '../../viewer.js';

export class RawEditorProvider implements vscode.CustomReadonlyEditorProvider<RawDocument> {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public openCustomDocument(uri: vscode.Uri): RawDocument {
    return new RawDocument(uri);
  }

  public resolveCustomEditor(document: RawDocument, panel: vscode.WebviewPanel): void {
    const viewer = new Viewer(
      this.context,
      panel.webview,
      'single',
      document.uri.toString(),
      [sourceFor(document.uri)],
    );

    if (panel.active) {
      setActive(viewer);
    }
    panel.onDidChangeViewState(() => {
      if (panel.active) {
        setActive(viewer);
      } else if (activeViewer === viewer) {
        setActive(undefined);
      }
    });
    panel.onDidDispose(() => {
      if (activeViewer === viewer) {
        setActive(undefined);
      }
      viewer.dispose();
    });
  }
}
