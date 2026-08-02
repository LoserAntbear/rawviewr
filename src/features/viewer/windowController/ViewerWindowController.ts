import * as vscode from 'vscode';
import { ViewType } from '../../../definitions/viewTypes';
import { ViewerRegistry } from '../registry/viewerRegistry';
import { Viewer } from '../../../viewer';
import { viewerSourceFor } from '../../vscode/uri';

export class ViewerWindowController {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly viewerRegistry: ViewerRegistry
  ) {}

  public async open(targets: vscode.Uri[], viewType: ViewType): Promise<void> {
    switch (viewType) {
      case ViewType.Single:
      case ViewType.Optional:
        await this.openSingle(targets);
        break;
      case ViewType.Gallery:
        await this.openGallery('Gallery', targets);
        break;
      default:
        throw new Error(`Unsupported view type: ${viewType}`);
    }
  }

  private async openSingle(targets: vscode.Uri[]): Promise<void> {
    for (const target of targets) {
      return await vscode.commands.executeCommand('vscode.openWith', target, ViewType.Optional);
    }
  }

  private async openGallery(title: string, targets: vscode.Uri[]): Promise<void> {
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
        targets.map(viewerSourceFor),
        (uri) => void vscode.commands.executeCommand('vscode.openWith', uri, ViewType.Optional),
      );

      this.viewerRegistry.register({ panel, viewer });
  }
}