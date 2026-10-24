import type { FormatRegistry } from '@SHARED/features/image/format/FormatRegistry';
import type { AppStoreState } from '@WEBVIEW/features/store/types';

import { resolveDisplayedItem } from './resolvers';
import type { StatusBarStateContext } from './types';

export function selectStatusBarContext(
  state: AppStoreState,
  formatRegistry: FormatRegistry,
): StatusBarStateContext {
  return {
    formatRegistry,
    appState: state,
    displayedItem: resolveDisplayedItem(state),
  };
}
