import type { ContentViewMode } from '@features/viewer';
import { selectUnique } from '@utils/array';
import { byKey, type Strategies } from '@utils/strategy';

import { StoreSliceId } from '../definitions';
import { STORE_SELECTORS } from '../selectors';
import type { AppStore, StoreReaction } from '../types';

import { selectUndecodedIds } from './utils';

/**
 * For the single view I give all sources ids and simply fetch a single one. Since it's single view mode.
 *
 * For the gallery, however, I need to consider all items currently in the viewport and any retainable images.
 */
const DISPLAY_ITEM_IDS_STRATEGIES_BY_VIEW_MODE: Strategies<ContentViewMode, [AppStore], readonly string[]> = {
  single: (store) => store.get(StoreSliceId.Sources).ids,
  gallery: (store) => selectUnique(
    [...store.get(StoreSliceId.VirtualList).ids] as readonly string[],
    STORE_SELECTORS.selectRetainableImageIds(store.state),
  ),
};

function resolveDecodeTargets(store: AppStore): readonly string[] {
  return byKey(DISPLAY_ITEM_IDS_STRATEGIES_BY_VIEW_MODE, store.get(StoreSliceId.View).mode, store);
}

/**
 * So. I've brought virtualization exactly for that:
 * I only request to decode these gallery items, which currently are present
 * in viewport.
 *
 * Reducing the memory consumed and load for decoding.
 */
const requestDecodeOnVirtualizationChange: StoreReaction = (store) => ({
  dispose: store.bus.on('virtualList:change', ({ detail: { next } }) => {
    const images = store.get(StoreSliceId.Images);
    const idsToRequest = selectUndecodedIds(next.ids, images.getState().byId);

    images.clearAllExcept(resolveDecodeTargets(store));

    if (idsToRequest.length > 0) {
      images.queueDecode(idsToRequest);
    }
  }),
});

/**
 * As user changes decode options, we need to re-decode them with the new settings.
 *
 * To avoid re-decoding everything unnecessarily, we only target the currently relevant items.
 */
const requestDecodeOnOptionsChange: StoreReaction = (store) => ({
  dispose: store.bus.on('decodeOptions:change', () => {
    const targets = resolveDecodeTargets(store);

    store.get(StoreSliceId.Images).clearAllExcept(targets);

    if (targets.length > 0) {
      store.bus.emit('images:decode:requested', { ids: targets });
    }
  }),
});

/**
 * To actually display the data I firstly decode the image from source.
 * I DO NOT STORE the source – it's rendered and discarded immediately (by canvas).
 * No need for that to be keptin the store.
 * Imagine 300 items gallery of 4K images.
 *
 * Pinned items also display the data of the SOURCE file.
 * Thus we have to request it from source to avoid keeping he source itself in store.
 */
const requestSourceFileBytesOnPin: StoreReaction = (store) => ({
  dispose: store.bus.on('probe:change', ({ detail: { prev, next } }) => {
    const pinned = next.pinnedSample;

    if (pinned && pinned !== prev.pinnedSample && pinned.sourceFileBytes.kind === 'pending') {
      store.bus.emit('probe:receive:source-bytes:requested', { id: pinned.id, location: pinned.location });
    }
  }),
});

/**
 * We want all windows to fetch up new decode options when they change in the active window.
 */
const updateSnapshotOnOptionsChange: StoreReaction = (store) => ({
  dispose: store.bus.on('decodeOptions:change', ({ detail: { next } }) => {
    if (store.get(StoreSliceId.Config).preserveOptionsForAllWindows) {
      store.bus.emit('decodeOptions:snapshot:requested', { options: next });
    }
  }),
});

/**
 * The idea of reactions is to provide a scoped tool
 * for cross-slice interaction without exposing the implementation details of each slice
 * And without polluting the slices and store itself with cross-slice logic.
 */
export const STORE_REACTIONS: readonly StoreReaction[] = [
  requestSourceFileBytesOnPin,
  requestDecodeOnOptionsChange,
  updateSnapshotOnOptionsChange,
  requestDecodeOnVirtualizationChange,
];
