import { WebviewDisposableStore } from '../disposable/WebviewDisposableStore';
import { TypedEventTarget } from './TypedEventTarget';

import { ReactiveStore } from './ReactiveStore';
import { STORE_SELECTORS } from './selectors';
import { StoreSliceId } from './definitions';
import { SourcesSlice } from './slice/SourcesSlice/SourcesSlice';
import { ViewSlice } from './slice/ViewSlice/ViewSlice';
import { ImagesSlice } from './slice/ImagesSlice/ImagesSlice';
import { STORE_REACTIONS } from './reactions';
import type { FormatRegistry } from '@features/image/format/FormatRegistry';
import type { AppStore, StoreSlices, StoreReaction } from './types';
import { WebviewImageDecoder } from '../image/WebviewImageDecoder';


function createDefaultSlices(
  formatRegistry: FormatRegistry
): StoreSlices {
  const decoder = new WebviewImageDecoder(formatRegistry);

  return {
    [StoreSliceId.View]: new ViewSlice(),
    [StoreSliceId.Sources]: new SourcesSlice(),
    [StoreSliceId.Images]: new ImagesSlice(decoder),
  };
}

export function createWebviewStore(
  formatRegistry: FormatRegistry,
  slices: StoreSlices = createDefaultSlices(formatRegistry),
  reactions: readonly StoreReaction[] = STORE_REACTIONS,
): { store: AppStore; disposables: WebviewDisposableStore } {
  const disposables = new WebviewDisposableStore();
  const store: AppStore = new ReactiveStore(slices, new TypedEventTarget(), STORE_SELECTORS);

  for (const reaction of reactions) {
    disposables.add(reaction(store));
  }

  return { store, disposables };
}
