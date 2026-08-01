import * as vscode from 'vscode';
import { ViewType } from '../../../../definitions/viewTypes';
import { Viewer } from '../../../../viewer';
import { viewerSourceFor } from '../../../vscode/uri';
import { VIEWER_REGISTRY } from '../../../../runtime/viewerRegistry';

export function openGalleryHandler(context: vscode.ExtensionContext, title: string, uris: vscode.Uri[]): void {
  if (uris.length === 0) {
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
    context,
    panel.webview,
    'gallery',
    `gallery:${title}`,
    uris.map(viewerSourceFor),
    (uri) => void vscode.commands.executeCommand('vscode.openWith', uri, ViewType.Optional),
  );

  VIEWER_REGISTRY.register({ panel, viewer });
}
