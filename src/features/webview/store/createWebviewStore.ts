import { WebviewDisposableStore } from '../disposable/WebviewDisposableStore';
import { TypedEventTarget } from './TypedEventTarget';

import { ReactiveStore } from './ReactiveStore';
import { STORE_SELECTORS } from './selectors';
import { StoreSliceId } from './definitions';
import { SourcesSlice } from './slice/SourcesSlice/SourcesSlice';
import { ViewSlice } from './slice/ViewSlice/ViewSlice';
import { ImagesSlice } from './slice/ImagesSlice/ImagesSlice';
import { DecodeOptionsSlice } from './slice/DecodeOptionsSlice';
import { STORE_REACTIONS } from './reactions';
import type { AppStore, StoreSlices, StoreReaction } from './types';

type CreateWebviewStoreResult = {
  store: AppStore;
  disposables: WebviewDisposableStore;
};

function createDefaultSlices(
): StoreSlices {
  return {
    [StoreSliceId.View]: new ViewSlice(),
    [StoreSliceId.Images]: new ImagesSlice(),
    [StoreSliceId.Sources]: new SourcesSlice(),
    [StoreSliceId.DecodeOptions]: new DecodeOptionsSlice(),
  };
}

export function createWebviewStore(
  slices: StoreSlices = createDefaultSlices(),
  reactions: readonly StoreReaction[] = STORE_REACTIONS,
): CreateWebviewStoreResult {
  const disposables = new WebviewDisposableStore();
  const store: AppStore = new ReactiveStore(slices, new TypedEventTarget(), STORE_SELECTORS);

  for (const reaction of reactions) {
    disposables.add(reaction(store));
  }

  return { store, disposables };
}
