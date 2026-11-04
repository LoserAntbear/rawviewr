import { IntentKind } from '@definitions/intent';
import { InfoMessageController } from '@EXTENSION/features/infoMessage/InfoMessageController';
import type { IntentResolverMap } from '@EXTENSION/features/intent/types';
import { findGalleryTargets, folderTitle, selectionTitle } from '@EXTENSION/features/viewer/gallery/galleryTargets';
import type { ViewerRegistry } from '@EXTENSION/features/viewer/registry/viewerRegistry';
import type { ViewerWindowController } from '@EXTENSION/features/viewer/windowController/ViewerWindowController';
import { revealInExplorer } from '@EXTENSION/features/vscode/explorer';
import { resolveFolder, resolveUriTargets } from '@EXTENSION/features/vscode/utils/uri';

type ViewerIntentKind =
  | IntentKind.viewerOpenSingle
  | IntentKind.viewerOpenGallery
  | IntentKind.viewerOpenFolderGallery;

export const VIEWER_INTENT_RESOLVERS = (
  windowController: ViewerWindowController,
): Pick<IntentResolverMap, ViewerIntentKind> => ({
  [IntentKind.viewerOpenSingle]: async ({ targets }) => {
    try {
      return await windowController.openSingle(await resolveUriTargets(targets));
    } catch (error) {
      InfoMessageController.showError(
        `Failed to open single viewer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  [IntentKind.viewerOpenGallery]: async ({ targets }) => {
    try {
      const resolved = await resolveUriTargets(targets);

      await windowController.openGallery(selectionTitle(resolved), resolved);
    } catch (error) {
      InfoMessageController.showError(
        `Failed to open gallery: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  [IntentKind.viewerOpenFolderGallery]: async ({ folder }) => {
    try {
      const resolved = await resolveFolder(folder);

      if (!resolved) {
        return;
      }

      const targets = await findGalleryTargets(resolved);

      await windowController.openGallery(folderTitle(resolved, targets), targets);
    } catch (error) {
      InfoMessageController.showError(
        `Failed to open folder gallery: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});

type ViewIntentKind =
  | IntentKind.viewZoom
  | IntentKind.viewRevealItem;

export const VIEW_INTENT_RESOLVERS = (
  viewerRegistry: ViewerRegistry,
): Pick<IntentResolverMap, ViewIntentKind> => ({
  [IntentKind.viewZoom]: async ({ direction }) => {
    try {
      await viewerRegistry.activeViewer?.postToWebview({ type: 'view:zoom', direction });
    } catch (error) {
      InfoMessageController.showError(
        `Failed to zoom the view: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  [IntentKind.viewRevealItem]: async ({ itemId }) => {
    try {
      const source = viewerRegistry.activeViewer?.sourceFor(itemId);

      if (!source) {
        throw new Error('that item is no longer open');
      }

      await revealInExplorer(source.uri);
    } catch (error) {
      InfoMessageController.showError(
        `Failed to reveal the item: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
