import * as vscode from 'vscode';
import { RawDocument } from '@features/document/RawDocument';
import type { ViewerRegistry } from '@features/viewer/registry/viewerRegistry';
import { fileSourceForUri } from '@features/vscode/utils/uri';
import { WebviewHost } from '@features/webview/webviewHost/WebviewHost';

export class RawEditorProvider implements vscode.CustomReadonlyEditorProvider<RawDocument> {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly viewerRegistry: ViewerRegistry,
  ) {}

  public openCustomDocument(uri: vscode.Uri): RawDocument {
    return new RawDocument(uri);
  }

  public resolveCustomEditor(document: RawDocument, panel: vscode.WebviewPanel): void {
    const viewer = new WebviewHost(
      this.context,
      panel.webview,
      [
        fileSourceForUri(document.uri),
      ],
      'single',
      // document.uri.toString(),
    );

    this.viewerRegistry.register({ panel, viewer });
  }
}
