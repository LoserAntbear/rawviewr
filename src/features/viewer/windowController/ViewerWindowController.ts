import * as vscode from 'vscode';

import { ViewType } from '../../../definitions/viewTypes';
import { Viewer } from '../../../viewer';
import { viewerSourceForUri } from '../../vscode/utils/uri';
import type { ViewerRegistry } from '../registry/viewerRegistry';

export class ViewerWindowController {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly viewerRegistry: ViewerRegistry,
  ) {}

  /** Opens every target in its own editor tab. */
  public async openSingle(targets: readonly vscode.Uri[]): Promise<void> {
    for (const target of targets) {
      await vscode.commands.executeCommand('vscode.openWith', target, ViewType.Optional);
    }
  }

  public async openGallery(title: string, targets: readonly vscode.Uri[]): Promise<void> {
    if (targets.length === 0) {
      void vscode.window.showInformationMessage('Raw Image Viewer: no matching files to show.');

      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ViewType.Gallery,
      `Raw Gallery — ${title}`,
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    const viewer = new Viewer(
      this.context,
      panel.webview,
      'gallery',
      `gallery:${title}`,
      targets.map(viewerSourceForUri),
      (uri) => void vscode.commands.executeCommand('vscode.openWith', uri, ViewType.Optional),
    );

    this.viewerRegistry.register({ panel, viewer });
  }
}
