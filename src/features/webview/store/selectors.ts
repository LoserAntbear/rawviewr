import type { BufferItemData } from '@features/buffer';

import { StoreSliceId } from './definitions';
import type { AppStoreState, Selector, SelectorMap } from './types';

const itemIds: Selector<AppStoreState, readonly string[]> = (state) => (
  [...state[StoreSliceId.Items].byId.keys()]
);

const item: Selector<AppStoreState, BufferItemData | undefined, [id: string]> = (state, id) => (
  state[StoreSliceId.Items].byId.get(id)
);

const visibleIds: Selector<AppStoreState, readonly string[]> = (state) => {
  const { mode, selectedId } = state[StoreSliceId.View];
  const ids = itemIds(state);

  if (mode === 'gallery') {
    return ids;
  }

  return selectedId === null ? ids.slice(0, 1) : [selectedId];
};

const selectedId: Selector<AppStoreState, string | null> = (state) => (
  state[StoreSliceId.View].selectedId
);

export const STORE_SELECTORS = {
  item,
  itemIds,
  visibleIds,
  selectedId,
} satisfies SelectorMap<AppStoreState>;
