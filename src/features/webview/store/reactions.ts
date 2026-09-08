import { ViewSlice } from './slice/ViewSlice';
import type { ItemsSlice } from './slice/ItemsSlice';
import { StoreEvent, StoreSliceId } from './definitions';
import type { StoreReaction } from './types';

function reconcile(view: ViewSlice, items: ItemsSlice): void {
  const { selectedId } = view.get();

  if (selectedId !== null && items.has(selectedId)) {
    return;
  }

  const [first] = items.ids;

  view.select(first ?? null);
}

const reconcileSelection: StoreReaction = (store) => {
  const view = store.get(StoreSliceId.View);
  const items = store.get(StoreSliceId.Items);

  // Items may already be present by the time reactions are wired.
  reconcile(view, items);

  return { dispose: store.bus.on(StoreEvent.ItemsChange, () => reconcile(view, items)) };
};

/**
 * The idea of reactions is to provide a scoped tool
 * for cross-slice interaction without exposing the implementation details of each slice
 * And without polluting the slices and store itself with cross-slice logic.
 */
export const STORE_REACTIONS: readonly StoreReaction[] = [reconcileSelection];
