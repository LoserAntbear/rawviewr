import { StoreSliceId } from '@WEBVIEW/features/store/definitions';
import { STORE_SELECTORS } from '@WEBVIEW/features/store/selectors';
import type { AppStoreState } from '@WEBVIEW/features/store/types';

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
  };
}
