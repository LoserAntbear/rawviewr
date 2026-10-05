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
 * To actually display the data I firstly decode the image from source.
 * I DO NOT STORE the source – it's rendered and discarded immediately. No need for that in the store.
 * Imagine 100 items gallery for 4K images.
 *
 * Pinned items also display the data of the SOURCE file.
 * Thus we have to request it from source to avoid keeping it in store.
 */
const requestSourceFileBytesOnPin: StoreReaction = (store) => ({
  dispose: store.bus.on('probe:change', ({ detail: { prev, next } }) => {
    const pinned = next.pinnedSample;

    if (pinned && pinned !== prev.pinnedSample && pinned.sourceFileBytes === null) {
      store.bus.emit('probe:receive:source-bytes:requested', { id: pinned.id, location: pinned.location });
    }
  }),
});

/**
 * The idea of reactions is to provide a scoped tool
 * for cross-slice interaction without exposing the implementation details of each slice
 * And without polluting the slices and store itself with cross-slice logic.
 */
export const STORE_REACTIONS: readonly StoreReaction[] = [requestDecodeOnOptionsChange, requestSourceFileBytesOnPin];
