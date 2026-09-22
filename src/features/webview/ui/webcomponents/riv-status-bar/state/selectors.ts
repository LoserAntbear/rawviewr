import type { AppStoreState } from '@features/webview/store/types';
import type { FormatRegistry } from '@features/image/format/FormatRegistry';

import type { StatusBarStateContext } from './types';
import { resolveDisplayedItem } from './resolvers';

export function selectStatusBarContext(
  state: AppStoreState,
  formatRegistry: FormatRegistry
): StatusBarStateContext {
  return {
    formatRegistry,
    appState: state,
    displayedItem: resolveDisplayedItem(state),
  };
}
