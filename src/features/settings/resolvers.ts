import * as vscode from 'vscode';

import { OPTIONS_MEMENTO_PREFIX } from '@root/viewer';
import type { IntentResolverMap } from '@features/intent/types';
import { IntentKind } from '@definitions/intent';

type SettingsIntentKind =
  | IntentKind.settingsReset;

export const SETTINGS_INTENT_RESOLVERS = (
  workspaceState: vscode.Memento,
): Pick<IntentResolverMap, SettingsIntentKind> => ({
  // TODO: Introdudce a proper state management wrapper for settings
  [IntentKind.settingsReset]: async () => {
    const keys = workspaceState.keys().filter((key) => key.startsWith(OPTIONS_MEMENTO_PREFIX));

    for (const key of keys) {
      await workspaceState.update(key, undefined);
    }

    void vscode.window.showInformationMessage(
      `Raw Image Viewer: cleared decode settings for ${keys.length} buffer(s). Reopen any view to pick up the defaults.`,
    );
  },
});
