import type * as vscode from 'vscode';

import { RawDocument } from '@EXTENSION/features/document/RawDocument';
import type { SourcesDecoder } from '@EXTENSION/features/image/imageDecoder/SourcesDecoder';
import type { SettingsController } from '@EXTENSION/features/settings/SettingsController';
import {
  ContentViewSession,
  type ViewerRegistry,
  type ViewerWindowController,
} from '@EXTENSION/features/viewer';
import { fileSourceForUri } from '@EXTENSION/features/vscode/utils/uri';
import { WebviewHost } from '@EXTENSION/features/webviewHost/WebviewHost';

export class RawEditorProvider implements vscode.CustomReadonlyEditorProvider<RawDocument> {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly viewerRegistry: ViewerRegistry,
    private readonly settingsController: SettingsController,
    private readonly sourcesDecoder: SourcesDecoder,
    private readonly windowController: ViewerWindowController,
  ) {}

  public openCustomDocument(uri: vscode.Uri): RawDocument {
    return new RawDocument(uri);
  }

  public resolveCustomEditor(document: RawDocument, panel: vscode.WebviewPanel): void {
    const viewer = new WebviewHost(
      this.context,
      panel.webview,
      new ContentViewSession('single', [fileSourceForUri(document.uri)]),
      this.settingsController,
      this.sourcesDecoder,
      this.windowController,
    );

    this.viewerRegistry.register({ panel, viewer });
  }
}
