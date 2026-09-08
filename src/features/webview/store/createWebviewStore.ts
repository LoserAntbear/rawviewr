import { WebviewDisposableStore } from '../disposable/WebviewDisposableStore';
import { WebviewImageDecoder } from '../image/WebviewImageDecoder';
import { TypedEventTarget } from './TypedEventTarget';

import { ReactiveStore } from './ReactiveStore';
import { STORE_SELECTORS } from './selectors';
import { StoreSliceId } from './definitions';
import { ItemsSlice } from './slice/ItemsSlice';
import { ViewSlice } from './slice/ViewSlice';
import { DecodeSlice } from './slice/DecodeSlice';
import { STORE_REACTIONS } from './reactions';
import type { AppStore, StoreSlices, StoreReaction } from './types';

const SLICES = {
  [StoreSliceId.View]: new ViewSlice(),
  [StoreSliceId.Items]: new ItemsSlice(),
  [StoreSliceId.Decode]: new DecodeSlice(new WebviewImageDecoder()),
};

export function createWebviewStore(
  slices: StoreSlices = SLICES,
  reactions: readonly StoreReaction[] = STORE_REACTIONS,
): { store: AppStore; disposables: WebviewDisposableStore } {
  const disposables = new WebviewDisposableStore();
  const store: AppStore = new ReactiveStore(slices, new TypedEventTarget(), STORE_SELECTORS);

  for (const reaction of reactions) {
    disposables.add(reaction(store));
  }

  return { store, disposables };
}
