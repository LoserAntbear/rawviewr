import * as vscode from 'vscode';

/** Merge the `(uri, uris)` pair the explorer sends, keeping order, dropping repeats. */
export function dedupeUris(uris: readonly vscode.Uri[]): vscode.Uri[] {
  const seen = new Set<string>();

  return uris.filter((uri) => {
    const key = uri.toString();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
