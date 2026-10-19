import { WebviewDisposableStore } from '../disposable/WebviewDisposableStore';
import { TypedEventTarget } from '../messaging/TypedEventTarget/TypedEventTarget';

import { StoreSliceId } from './definitions';
import { STORE_REACTIONS } from './reactions';
import { ReactiveStore } from './ReactiveStore';
import { STORE_SELECTORS } from './selectors';
import { ConfigSlice } from './slice/ConfigSlice/ConfigSlice';
import { DecodeOptionsSlice } from './slice/DecodeOptionsSlice';
import { ImagesSlice } from './slice/ImagesSlice/ImagesSlice';
import { ProbeSlice } from './slice/ProbeSlice/ProbeSlice';
import { SourcesSlice } from './slice/SourcesSlice/SourcesSlice';
import { ViewSlice } from './slice/ViewSlice/ViewSlice';
import { VirtualListSlice } from './slice/VirtualListSlice/VirtualListSlice';
import type { AppStore, StoreReaction, StoreSlices } from './types';

type CreateWebviewStoreResult = {
  store: AppStore;
  disposables: WebviewDisposableStore;
};

function createDefaultSlices(
): StoreSlices {
  return {
    [StoreSliceId.View]: new ViewSlice(),
    [StoreSliceId.Probe]: new ProbeSlice(),
    [StoreSliceId.Config]: new ConfigSlice(),
    [StoreSliceId.Images]: new ImagesSlice(),
    [StoreSliceId.Sources]: new SourcesSlice(),
    [StoreSliceId.VirtualList]: new VirtualListSlice(),
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
