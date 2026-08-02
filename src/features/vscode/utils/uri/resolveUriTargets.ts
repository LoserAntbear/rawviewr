
import * as vscode from 'vscode';
import { asLocalAllowedUri } from '../../guards/uri/asLocalAllowedUri';
import { nullishCoalesce } from '../../../../utils/coalesce';

function activeDocumentUri(): vscode.Uri | null {
  return asLocalAllowedUri(vscode.window.activeTextEditor?.document.uri);
}

async function pickTargets(): Promise<vscode.Uri[]> {
  try {
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: true,
      title: 'Select raw image buffers',
    });

    return picked ?? [];
  } catch (err) {
    void vscode.window.showErrorMessage(`Failed to open raw image selection dialog: ${err}`);

    return [];
  }
}

function resolveParsedUris(parsed: readonly vscode.Uri[]): vscode.Uri[] | null {
  return (parsed.length === 0) ? null : [...parsed];
}

function resolveActiveDocumentUri(): vscode.Uri[] | null {
  const active = activeDocumentUri();

  return active ? [active] : null;
}

export async function resolveUriTargets(parsed: readonly vscode.Uri[]): Promise<vscode.Uri[]> {
  return nullishCoalesce(
    resolveParsedUris(parsed),
    resolveActiveDocumentUri(),
    await pickTargets(),
  ) || [];
}
