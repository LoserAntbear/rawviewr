import * as vscode from 'vscode';

import { InfoMessageController } from '@features/infoMessage/InfoMessageController';

async function resolvePickedUrisWithDialog():  Promise<vscode.Uri | null> {
  try {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      title: 'Select a folder of raw buffers',
    });

    return picked?.[0] ?? null;
  } catch (err) {
    InfoMessageController.showError(`Failed to open folder selection dialog: ${err}`);

    return null;
  }
}

/** `??` is lazy: the picker opens only when no folder was given. */
export async function resolveFolder(parsed: vscode.Uri | null): Promise<vscode.Uri | null> {
  return parsed ?? await resolvePickedUrisWithDialog();
}
