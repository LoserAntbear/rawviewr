import { StoreSliceId } from '@features/webview/store/definitions';
import { STORE_SELECTORS } from '@features/webview/store/selectors';
import type { AppStoreState } from '@features/webview/store/types';

import type { GalleryState } from './types';

// Simple for now, no need for complex ceremony logic
export function resolveGalleryState(state: AppStoreState): GalleryState {
  const { mode, zoom, background } = state[StoreSliceId.View];
  const { tileSize } = state[StoreSliceId.Config];
  const { selectedId } = state[StoreSliceId.Images];

  return {
    mode,
    zoom,
    tileSize,
    background,
    selectedId,
    imageIds: STORE_SELECTORS.imageIds(state),
    visibleIds: STORE_SELECTORS.visibleIds(state),
  };
}
