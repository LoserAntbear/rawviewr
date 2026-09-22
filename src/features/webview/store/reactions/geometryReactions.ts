import type { BufferItemData as FileSource, ItemGeometry } from '@features/buffer';
import type { SourcesSlice } from '../slice/SourcesSlice/SourcesSlice';
import type { DecodeSlice } from '../slice/DecodeSlice';
import { StoreEvent, StoreSliceId } from '../definitions';
import { StoreReaction } from '../types';

function selectUnresolvedItems(item: FileSource): boolean {
  return item.geometry === undefined;
}

function sameGeometry(prev: ItemGeometry | undefined, next: ItemGeometry): boolean {
  return prev !== undefined && JSON.stringify(prev) === JSON.stringify(next);
}

// TODO: clean that up
function refreshGeometry(
  items: SourcesSlice,
  decode: DecodeSlice,
  filter: (item: FileSource) => boolean,
): void {
  items.upsert(
    [...items.getState().byId.values()]
      .filter(filter)
      .map((item) => ({ item, geometry: decode.resolveGeometry(item) }))
      .filter(({ item, geometry }) => !sameGeometry(item.geometry, geometry))
      .map(({ item, geometry }) => ({ ...item, geometry })),
  );
}

export const resolveItemsGeometry: StoreReaction = (store) => {
  const items = store.get(StoreSliceId.Sources);
  const decode = store.get(StoreSliceId.Decode);

  // Items may already be present by the time reactions are wired.
  refreshGeometry(items, decode, selectUnresolvedItems);

  const disposables = [
    store.bus.on(StoreEvent.SourcesChange, () => refreshGeometry(items, decode, selectUnresolvedItems)),
    store.bus.on(StoreEvent.DecodeChange, () => refreshGeometry(items, decode, () => true)), // Force refresh all items when decode changes
  ];

  return { dispose: () => disposables.forEach((dispose) => dispose()) };
};
