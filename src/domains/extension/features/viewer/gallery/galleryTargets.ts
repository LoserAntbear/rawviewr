import * as vscode from 'vscode';

/**
 * TODO: Move to the extension config if possible
 */
const DEFAULT_INCLUDE_GLOB =
  '**/*.{raw,imag,bin,dat,data,dump,fb,rgb,rgba,bgra,argb,565,4444,gray,pix,tex,img}';
const EXCLUDE_GLOB = '**/node_modules/**';
const MAX_RESULTS = 2000;

/** Every raw buffer under `folder`, in stable path order. */
export async function findGalleryTargets(folder: vscode.Uri): Promise<vscode.Uri[]> {
  const glob = vscode.workspace
    .getConfiguration('rawImageViewer')
    .get<string>('galleryIncludeGlob', DEFAULT_INCLUDE_GLOB);

  const found = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, glob),
    EXCLUDE_GLOB,
    MAX_RESULTS,
  );

  return [...found].sort((a, b) => a.path.localeCompare(b.path));
}

/** Parent folder of the selection, used to title a gallery of loose files. */
export function selectionTitle(targets: readonly vscode.Uri[]): string {
  const parent = targets[0]?.path.split('/').slice(-2, -1)[0] ?? 'selection';

  return `${parent} (${targets.length})`;
}

export function folderTitle(folder: vscode.Uri, targets: readonly vscode.Uri[]): string {
  const name = folder.path.split('/').pop() || 'folder';

  return `${name} (${targets.length})`;
}
