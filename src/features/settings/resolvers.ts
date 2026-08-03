import type { IntentResolverMap } from '@features/intent/types';
import { IntentKind } from '@definitions/intent';

import type { SettingsController } from './SettingsController';

type SettingsIntentKind =
  | IntentKind.settingsReset;

export const SETTINGS_INTENT_RESOLVERS = (
  settingsController: SettingsController,
): Pick<IntentResolverMap, SettingsIntentKind> => ({
  // TODO: Introdudce a proper state management wrapper for settings
  [IntentKind.settingsReset]: async () => {
    settingsController.resetSettings();
  },
});
