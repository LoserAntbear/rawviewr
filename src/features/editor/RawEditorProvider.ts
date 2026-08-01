import * as vscode from 'vscode';
import { RawDocument } from '../document/RawDocument';
import { Viewer } from '../../viewer';
import type { ViewerRegistry } from '../viewer/registry/viewerRegistry';
import { viewerSourceFor } from '../vscode/uri';

export class RawEditorProvider implements vscode.CustomReadonlyEditorProvider<RawDocument> {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly viewerRegistry: ViewerRegistry,
  ) {}

  public openCustomDocument(uri: vscode.Uri): RawDocument {
    return new RawDocument(uri);
  }

  public resolveCustomEditor(document: RawDocument, panel: vscode.WebviewPanel): void {
    const viewer = new Viewer(
      this.context,
      panel.webview,
      'single',
      document.uri.toString(),
      [
        viewerSourceFor(document.uri),
      ],
    );

    this.viewerRegistry.register({ panel, viewer });
  }
}
