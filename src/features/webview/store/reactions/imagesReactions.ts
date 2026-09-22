import { ViewSlice } from '../slice/ViewSlice/ViewSlice';
import type { SourcesSlice } from '../slice/SourcesSlice/SourcesSlice';
import { StoreEvent, StoreSliceId } from '../definitions';
import type { StoreReaction } from '../types';

function reconcile(view: ViewSlice, items: SourcesSlice): void {
  const { selectedId } = view.getState();

  if (selectedId !== null && items.has(selectedId)) {
    return;
  }

  const [first] = items.ids;

  view.select(first ?? null);
}

export const reconcileSelectedImage: StoreReaction = (store) => {
  const view = store.get(StoreSliceId.View);
  const items = store.get(StoreSliceId.Sources);

  // Items may already be present by the time reactions are wired.
  reconcile(view, items);

  return { dispose: store.bus.on(StoreEvent.SourcesChange, () => reconcile(view, items)) };
};

export const decodeVisibleImages: StoreReaction = (store) => {
  const images = store.get(StoreSliceId.Images);

  const disposables = [
    // store.bus.on(StoreEvent.ViewChange, () => decoder.schedule()),
    // store.bus.on(StoreEvent.ItemsChange, () => decoder.schedule()),
    // // The options moved, so every decoded pixel is out of date.
    // store.bus.on(StoreEvent.DecodeChange, () => decoder.invalidate()),
  ];
  const dispose = () => disposables.forEach((off) => off());

  return { dispose };
};