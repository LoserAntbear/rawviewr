import { WebviewDisposableStore } from '../disposable/WebviewDisposableStore';
import { TypedEventTarget } from './TypedEventTarget';

import { ReactiveStore } from './ReactiveStore';
import { STORE_SELECTORS } from './selectors';
import { StoreSliceId } from './definitions';
import { SourcesSlice } from './slice/ItemsSlice';
import { ViewSlice } from './slice/ViewSlice';
import { ImagesSlice } from './slice/ImagesSlice/ImagesSlice';
import { STORE_REACTIONS } from './reactions';
import type { FormatRegistry } from '@features/image/format/FormatRegistry';
import type { AppStore, StoreSlices, StoreReaction } from './types';


function createDefaultSlices(): StoreSlices {
  return {
    [StoreSliceId.View]: new ViewSlice(),
    [StoreSliceId.Images]: new ImagesSlice(),
    [StoreSliceId.Sources]: new SourcesSlice(),
  };
}

export function createWebviewStore(
  _formatRegistry: FormatRegistry,
  slices: StoreSlices = createDefaultSlices(),
  reactions: readonly StoreReaction[] = STORE_REACTIONS,
): { store: AppStore; disposables: WebviewDisposableStore } {
  const disposables = new WebviewDisposableStore();
  const store: AppStore = new ReactiveStore(slices, new TypedEventTarget(), STORE_SELECTORS);

  for (const reaction of reactions) {
    disposables.add(reaction(store));
  }

  return { store, disposables };
}
