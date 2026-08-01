import * as vscode from 'vscode';
import { nullishCoalesce } from '../../utils/coalesce';

function resolveActiveDocumentUri(): vscode.Uri | null {
  const active = vscode.window.activeTextEditor?.document.uri;

  if (active && active.scheme === 'file') {
    return active;
  }

  return null;
}

function resolveTargetsFromUriList(uris?: vscode.Uri[]): vscode.Uri[] | null {
  if (Array.isArray(uris) && uris.length > 0) {
    return uris;
  }

  return null;
}

function resolveTargetsFromUri(uri?: vscode.Uri): vscode.Uri[] | null {
  const resolvedUri = uri ?? resolveActiveDocumentUri();

  return resolvedUri ? [resolvedUri] : null;
}

async function resolveTargetsFromSelectionDialog(): Promise<vscode.Uri[] | null> {
  try {
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: true,
      title: 'Select raw image buffers',
    });

    return picked ?? null;
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to open raw image selection dialog: ${err}`);

    return null;
  }
}

export async function resolveUriTargets(
  uri?: vscode.Uri,
  uris?: vscode.Uri[],
): Promise<vscode.Uri[]> {
  return nullishCoalesce(
    resolveTargetsFromUriList(uris),
    resolveTargetsFromUri(uri),
    await resolveTargetsFromSelectionDialog(),
  ) ?? [];
}
