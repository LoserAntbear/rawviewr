import * as vscode from 'vscode';

import type { IntentResolverMap } from '../intent/types';
import { findGalleryTargets, folderTitle, selectionTitle } from './gallery/galleryTargets';
import type { ViewerRegistry } from './registry/viewerRegistry';
import type { ViewerWindowController } from './windowController/ViewerWindowController';
import { IntentKind } from '../../definitions/intent';
import { resolveUriTargets, resolveFolder } from '../vscode/utils/uri';

type ViewerIntentKind =
  | IntentKind.viewerOpenSingle
  | IntentKind.viewerOpenGallery
  | IntentKind.viewerRequestExport
  | IntentKind.viewerOpenFolderGallery;

/**
 * The viewer feature's slice of the resolver map. Each body gathers whatever the
 * parser could not know — a prompt, a workspace scan, the active panel — and
 * then delegates. Anything longer than a few lines belongs in a service.
 */
export const viewerIntentResolvers = (
  windowController: ViewerWindowController,
  viewerRegistry: ViewerRegistry,
): Pick<IntentResolverMap, ViewerIntentKind> => ({
  [IntentKind.viewerOpenSingle]: async ({ targets }) => {
    return windowController.openSingle(await resolveUriTargets(targets));
  },

  [IntentKind.viewerOpenGallery]: async ({ targets }) => {
    const resolved = await resolveUriTargets(targets);

    await windowController.openGallery(selectionTitle(resolved), resolved);
  },

  [IntentKind.viewerOpenFolderGallery]: async ({ folder }) => {
    const resolved = await resolveFolder(folder);

    if (!resolved) {
      return;
    }

    const targets = await findGalleryTargets(resolved);

    await windowController.openGallery(folderTitle(resolved, targets), targets);
  },

  [IntentKind.viewerRequestExport]: async ({ format }) => {
    const viewer = viewerRegistry.activeViewer;

    if (!viewer) {
      void vscode.window.showInformationMessage(
        'Raw Image Viewer: focus a raw image view first.',
      );

      return;
    }

    viewer.requestExport(format);
  },
});
