import * as vscode from 'vscode';

import { ViewType } from '@definitions/viewTypes';
import { VSCodeCommands } from '@definitions/vscode';
import type { SourcesDecoder } from '@EXTENSION/features/image/imageDecoder/SourcesDecoder';
import { InfoMessageController } from '@EXTENSION/features/infoMessage/InfoMessageController';
import type { SettingsController } from '@EXTENSION/features/settings/SettingsController';
import { ContentViewSession, type  ViewerRegistry } from '@EXTENSION/features/viewer';
import { fileSourceForUri } from '@EXTENSION/features/vscode/utils/uri';
import { WebviewHost } from '@EXTENSION/features/webviewHost/WebviewHost';

export class ViewerWindowController {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly viewerRegistry: ViewerRegistry,
    private readonly settingsController: SettingsController,
    private readonly sourcesDecoder: SourcesDecoder,
  ) {}

  /** Opens every target in its own editor tab. */
  public async openSingle(targets: readonly vscode.Uri[]): Promise<void> {
    for (const target of targets) {
      await vscode.commands.executeCommand(VSCodeCommands.OpenWith, target, ViewType.Optional);
    }
  }

  public async openGallery(title: string, targets: readonly vscode.Uri[]): Promise<void> {
    if (targets.length === 0) {
      InfoMessageController.showInfo('Raw Image Viewer: no matching files to show.');

      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ViewType.Gallery,
      `Raw Gallery — ${title}`,
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    const viewer = new WebviewHost(
      this.context,
      panel.webview,
      new ContentViewSession('gallery', targets.map(fileSourceForUri)),
      this.settingsController,
      this.sourcesDecoder,
      this,
    );

    this.viewerRegistry.register({ panel, viewer });
  }
}
