import * as vscode from 'vscode';
import type { IntentResolverMap } from '@features/intent/types';
import type { ViewerRegistry } from '@features/viewer/registry/viewerRegistry';
import { IntentKind } from '@definitions/intent';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';

type FileExportIntentKind =
  | IntentKind.fileExportRequest;

export const EXPORT_INTENT_RESOLVERS = (
  viewerRegistry: ViewerRegistry,
): Pick<IntentResolverMap, FileExportIntentKind> => ({
  [IntentKind.fileExportRequest]: async ({ format }) => {
    try {
      const viewer = viewerRegistry.activeViewer;

      if (!viewer) {
        await vscode.window.showInformationMessage(
          'Raw Image Viewer: focus a raw image view first.',
        );

        return;
      }

      await viewer.requestExport(format);
    } catch (error) {
      InfoMessageController.showError(
        `Raw Image Viewer: failed to request export. ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});
