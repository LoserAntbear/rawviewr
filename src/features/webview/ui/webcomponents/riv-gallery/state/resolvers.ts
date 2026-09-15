import { StoreSliceId } from '@features/webview/store/definitions';
import { STORE_SELECTORS } from '@features/webview/store/selectors';
import type { AppStoreState } from '@features/webview/store/types';

import type { GalleryState } from './types';

// Simple for now, no need for complex ceremony logic
export function resolveGalleryState(state: AppStoreState): GalleryState {
  const { mode, selectedId } = state[StoreSliceId.View];

  return {
    mode,
    selectedId,
    visibleIds: STORE_SELECTORS.visibleIds(state),
  };
}
