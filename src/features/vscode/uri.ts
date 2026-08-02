import * as vscode from 'vscode';

import type { ViewerSource } from '../../viewer';
import { asLocalAllowedUri } from './guards/uri';
import { nullishCoalesce } from '../../utils/coalesce';

/**
 * Interactive fallbacks. These are effects, so they live on the resolver side
 * of the boundary — a parser never prompts.
 */

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

export async function resolveFolder(parsed: vscode.Uri | null): Promise<vscode.Uri | null> {
  if (parsed) {
    return parsed;
  }

  try {
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      title: 'Select a folder of raw buffers',
    });

    return picked?.[0] ?? null;
  } catch (err) {
    void vscode.window.showErrorMessage(`Failed to open folder selection dialog: ${err}`);

    return null;
  }
}

export function viewerSourceForUri(uri: vscode.Uri): ViewerSource {
  return {
    uri,
    id: uri.toString(),
    detail: vscode.workspace.asRelativePath(uri),
    name: uri.path.split('/').pop() || uri.toString(),
  };
}
