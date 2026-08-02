import * as vscode from 'vscode';
import { nullishCoalesce } from '../../../../utils/coalesce';

async function resolvePickedUrisWithDialog():  Promise<vscode.Uri | null> {
  try {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      title: 'Select a folder of raw buffers',
    });

    return picked?.[0] ?? null;
  } catch (err) {
    void vscode.window.showErrorMessage(`Failed to open folder selection dialog: ${err}`);

    return null;
  }
}

export async function resolveFolder(parsed: vscode.Uri | null): Promise<vscode.Uri | null> {
  return nullishCoalesce(parsed, await resolvePickedUrisWithDialog());
}
