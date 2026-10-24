import { isPresent } from '@guards/valueGuards';

import { StoreSliceId } from './definitions';
import type { ImageItem } from './slice/ImagesSlice/types';
import type { AppStoreState, Selector, SelectorMap } from './types';

const imageIds: Selector<AppStoreState, readonly string[]> = (state) => (
  [...state[StoreSliceId.Sources].byId.keys()]
);

const selectedId: Selector<AppStoreState, string | null> = (state) => (
  state[StoreSliceId.Images].selectedId
);

const visibleIds: Selector<AppStoreState, readonly string[]> = (state) => {
  const mode = state[StoreSliceId.View].mode;
  const id = selectedId(state);
  const ids = imageIds(state);

  if (mode === 'gallery') {
    return ids;
  }

  return id === null ? ids.slice(0, 1) : [id];
};

const displayedItem: Selector<AppStoreState, ImageItem | undefined> = (state) => {
  const [id] = visibleIds(state);

  return id === undefined ? undefined : state[StoreSliceId.Images].byId.get(id);
};

// I consider as `retainable` the image that is either currently selected or pinned in the probe.
// We should not evict these images from the store even if they are not currently visible.
// Since otherwise they might be removed from decoded state prematurely.
const selectRetainableImageIds: Selector<AppStoreState, readonly string[]> = (state) => {
  const selectedId = state[StoreSliceId.Images].selectedId;
  const pinnedId = state[StoreSliceId.Probe].pinnedSample?.id ?? null;

  return [selectedId, pinnedId].filter(isPresent);
};

export const STORE_SELECTORS = {
  imageIds,
  visibleIds,
  selectedId,
  displayedItem,
  selectRetainableImageIds,
} satisfies SelectorMap<AppStoreState>;
