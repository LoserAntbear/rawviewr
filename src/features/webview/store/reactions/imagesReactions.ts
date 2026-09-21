import { ViewSlice } from '../slice/ViewSlice';
import type { ItemsSlice } from '../slice/ItemsSlice';
import { StoreEvent, StoreSliceId } from '../definitions';
import type { StoreReaction } from '../types';
import { VisibleImageDecoder } from '@features/webview/image/VisibleImageDecoder';

function reconcile(view: ViewSlice, items: ItemsSlice): void {
  const { selectedId } = view.getState();

  if (selectedId !== null && items.has(selectedId)) {
    return;
  }

  const [first] = items.ids;

  view.select(first ?? null);
}

export const reconcileSelectedImages: StoreReaction = (store) => {
  const view = store.get(StoreSliceId.View);
  const items = store.get(StoreSliceId.Items);

  // Items may already be present by the time reactions are wired.
  reconcile(view, items);

  return { dispose: store.bus.on(StoreEvent.ItemsChange, () => reconcile(view, items)) };
};

export const decodeVisibleImages: StoreReaction = (store) => new VisibleImageDecoder(store);