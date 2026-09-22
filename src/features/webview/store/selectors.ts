import type { ImageItem } from './slice/ImagesSlice/types';
import { StoreSliceId } from './definitions';
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

export const STORE_SELECTORS = {
  imageIds,
  visibleIds,
  selectedId,
  displayedItem,
} satisfies SelectorMap<AppStoreState>;
