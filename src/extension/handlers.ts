import * as vscode from 'vscode';

import { ViewType } from '../definitions/viewTypes';

export async function handleOpen(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  try {
    const targets = await resolveTargets(uri, uris);

    for (const target of targets) {
      return await vscode.commands.executeCommand('vscode.openWith', target, ViewType.Optional);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to open raw image: ${err}`);
  }
}

export async function handleOpenGallery(uri?: vscode.Uri, uris?: vscode.Uri[]): Promise<void> {
  try {
    const targets = await resolveTargets(uri, uris);

    if (targets.length === 0) {
      return;
    }

    const folder = targets[0].path.split('/').slice(-2, -1)[0] ?? 'selection';

    openGallery(this.context, `${folder} (${targets.length})`, targets);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to open raw image gallery: ${err}`);
  }
}

export async function handleOpenFolderGallery(uri?: vscode.Uri): Promise<void> {
  try {
    const folder =
      uri ??
      (
        await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          title: 'Select a folder of raw buffers',
        })
      )?.[0];

    if (!folder) {
      return;
    }

    const glob = vscode.workspace
      .getConfiguration('rawImageViewer')
      .get<string>(
        'galleryIncludeGlob',
        '**/*.{raw,imag,bin,dat,data,dump,fb,rgb,rgba,bgra,argb,565,4444,gray,pix,tex,img}',
      );
    const found = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, glob),
      '**/node_modules/**',
      2000,
    );

    found.sort((a, b) => a.path.localeCompare(b.path));
    const name = folder.path.split('/').pop() || 'folder';
    openGallery(this.context, `${name} (${found.length})`, found);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to open raw image gallery: ${err}`);
  }
}

enum ExportFormat {
  Png = 'png',
}

export async function handleExport(format: ExportFormat = ExportFormat.Png): Promise<void> {
  try {
    const viewer = activeViewer();

    if (!viewer) {
      void vscode.window.showInformationMessage(
        'Raw Image Viewer: focus a raw image view first.',
      );
      return;
    }

    viewer.requestExport();
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to export raw image: ${err}`);
  }
}

export async function handleResetSettings(workspaceState: vscode.Memento): Promise<void> {
  try {
    const keys = workspaceState
      .keys()
      .filter((key) => key.startsWith('rawImageViewer.options:'));

    for (const key of keys) {
      await workspaceState.update(key, undefined);
    }

    void vscode.window.showInformationMessage(
      `Raw Image Viewer: cleared decode settings for ${keys.length} buffer(s). Reopen any view to pick up the defaults.`,
    );
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to reset decode settings: ${err}`);
  }
}
