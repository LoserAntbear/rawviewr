import * as vscode from 'vscode';
import { Viewer, type ViewerSource } from './viewer.js';
import { RawEditorProvider } from './features/editor/RawEditorProvider.js';

const SINGLE_VIEW_TYPE = 'rawImageViewer.editor';
const OPTIONAL_VIEW_TYPE = 'rawImageViewer.editor.optional';
const GALLERY_VIEW_TYPE = 'rawImageViewer.gallery';
const ACTIVE_CONTEXT = 'rawImageViewer.activeViewer';

/** The viewer belonging to the webview that currently has focus, if any. */
let activeViewer: Viewer | undefined;

function setActive(viewer: Viewer | undefined): void {
  activeViewer = viewer;
  void vscode.commands.executeCommand('setContext', ACTIVE_CONTEXT, !!viewer);
}

function sourceFor(uri: vscode.Uri): ViewerSource {
  return {
    id: uri.toString(),
    name: uri.path.split('/').pop() || uri.toString(),
    detail: vscode.workspace.asRelativePath(uri),
    uri,
  };
}

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

  if (panel.active) {
    setActive(viewer);
  }
  panel.onDidChangeViewState(() => {
    if (panel.active) {
      setActive(viewer);
    } else if (activeViewer === viewer) {
      setActive(undefined);
    }
  });
  panel.onDidDispose(() => {
    if (activeViewer === viewer) {
      setActive(undefined);
    }
    viewer.dispose();
  });
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

  const editorOptions = {
    webviewOptions: { retainContextWhenHidden: true },
    supportsMultipleEditorsPerDocument: true,
  };

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(SINGLE_VIEW_TYPE, provider, editorOptions),
    vscode.window.registerCustomEditorProvider(OPTIONAL_VIEW_TYPE, provider, editorOptions),

    vscode.commands.registerCommand(
      'rawImageViewer.open',
      async (uri?: vscode.Uri, uris?: vscode.Uri[]) => {
        const targets = await resolveTargets(uri, uris);
        for (const target of targets) {
          await vscode.commands.executeCommand('vscode.openWith', target, OPTIONAL_VIEW_TYPE);
        }
      },
    ),

    vscode.commands.registerCommand(
      'rawImageViewer.openGallery',
      async (uri?: vscode.Uri, uris?: vscode.Uri[]) => {
        const targets = await resolveTargets(uri, uris);
        if (targets.length === 0) {
          return;
        }
        const folder = targets[0].path.split('/').slice(-2, -1)[0] ?? 'selection';
        openGallery(context, `${folder} (${targets.length})`, targets);
      },
    ),

    vscode.commands.registerCommand(
      'rawImageViewer.openFolderGallery',
      async (uri?: vscode.Uri) => {
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
        openGallery(context, `${name} (${found.length})`, found);
      },
    ),

    vscode.commands.registerCommand('rawImageViewer.exportPng', () => {
      if (!activeViewer) {
        void vscode.window.showInformationMessage(
          'Raw Image Viewer: focus a raw image view first.',
        );
        return;
      }
      activeViewer.requestExport();
    }),

    vscode.commands.registerCommand('rawImageViewer.resetSettings', async () => {
      const keys = context.workspaceState
        .keys()
        .filter((key) => key.startsWith('rawImageViewer.options:'));
      for (const key of keys) {
        await context.workspaceState.update(key, undefined);
      }
      void vscode.window.showInformationMessage(
        `Raw Image Viewer: cleared decode settings for ${keys.length} buffer(s). Reopen any view to pick up the defaults.`,
      );
    }),
  );
}

export function deactivate(): void {
  // Deliberately not touching the context key here: command execution during
  // shutdown is not guaranteed to succeed.
  activeViewer = undefined;
}
