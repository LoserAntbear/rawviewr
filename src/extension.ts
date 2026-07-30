import * as vscode from 'vscode';
import { Viewer, sourceFor } from './viewer';
import { RawEditorProvider } from './features/editor/RawEditorProvider';
import { activeViewer, register } from './viewerRegistry';
import { ExtensionHost } from './extension/ExtensionHost';

function openGallery(context: vscode.ExtensionContext, title: string, uris: vscode.Uri[]): void {
  if (uris.length === 0) {
    void vscode.window.showInformationMessage('Raw Image Viewer: no matching files to show.');
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    GALLERY_VIEW_TYPE,
    `Raw Gallery — ${title}`,
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  const viewer = new Viewer(
    context,
    panel.webview,
    'gallery',
    `gallery:${title}`,
    uris.map(sourceFor),
    (uri) => void vscode.commands.executeCommand('vscode.openWith', uri, OPTIONAL_VIEW_TYPE),
  );

  register(panel, viewer);
}

/** Explorer context commands hand over (clicked, selection); the palette hands over nothing. */
async function resolveTargets(
  uri: vscode.Uri | undefined,
  uris: vscode.Uri[] | undefined,
): Promise<vscode.Uri[]> {
  if (uris && uris.length > 0) {
    return uris;
  }

  if (uri) {
    return [uri];
  }

  const active = vscode.window.activeTextEditor?.document.uri;

  if (active && active.scheme === 'file') {
    return [active];
  }

  const picked = await vscode.window.showOpenDialog({
    canSelectMany: true,
    title: 'Select raw image buffers',
  });
  return picked ?? [];
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new RawEditorProvider(context);
  const host = new ExtensionHost(context, provider);

  host.register();
}

export function deactivate(): void {
  // Nothing to tear down: viewers are disposed by their own panels.
}
