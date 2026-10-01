import { StoreSliceId } from '../definitions';
import type { StoreReaction } from '../types';

/**
 * TODO: when virtualisation's added, consider active IDS
 */
const requestDecodeOnOptionsChange: StoreReaction = (store) => ({
  dispose: store.bus.on('decodeOptions:change', () => {
    const { ids } = store.get(StoreSliceId.Sources);

    if (ids.length > 0) {
      store.bus.emit('images:decode:requested', { ids });
    }
  }),
});

/**
 * The idea of reactions is to provide a scoped tool
 * for cross-slice interaction without exposing the implementation details of each slice
 * And without polluting the slices and store itself with cross-slice logic.
 */
export const STORE_REACTIONS: readonly StoreReaction[] = [requestDecodeOnOptionsChange];
