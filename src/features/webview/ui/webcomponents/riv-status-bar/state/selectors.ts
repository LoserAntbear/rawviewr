import type { FormatRegistry } from '@features/image/format/FormatRegistry';
import type { AppStoreState } from '@features/webview/store/types';

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
