import * as vscode from 'vscode';

import { OPTIONS_MEMENTO_PREFIX } from '@root/viewer';
import type { IntentResolverMap } from '@features/intent/types';

export const settingsResolvers = (
  workspaceState: vscode.Memento,
): Pick<IntentResolverMap, 'settings/reset'> => ({
  'settings/reset': async () => {
    const keys = workspaceState.keys().filter((key) => key.startsWith(OPTIONS_MEMENTO_PREFIX));

    for (const key of keys) {
      await workspaceState.update(key, undefined);
    }

    void vscode.window.showInformationMessage(
      `Raw Image Viewer: cleared decode settings for ${keys.length} buffer(s). Reopen any view to pick up the defaults.`,
    );
  },
});
