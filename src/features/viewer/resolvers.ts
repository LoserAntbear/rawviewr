import type { IntentResolverMap } from '@features/intent/types';
import { findGalleryTargets, folderTitle, selectionTitle } from '@features/viewer/gallery/galleryTargets';
import type { ViewerWindowController } from '@features/viewer/windowController/ViewerWindowController';
import { IntentKind } from '@definitions/intent';
import { resolveUriTargets, resolveFolder } from '@features/vscode/utils/uri';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';

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
      await InfoMessageController.showError(
        `Failed to open single viewer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  [IntentKind.viewerOpenGallery]: async ({ targets }) => {
    try {
      const resolved = await resolveUriTargets(targets);

      await windowController.openGallery(selectionTitle(resolved), resolved);
    } catch (error) {
      await InfoMessageController.showError(
        `Failed to open gallery: ${error instanceof Error ? error.message : String(error)}`
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
      await InfoMessageController.showError(
        `Failed to open folder gallery: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});
