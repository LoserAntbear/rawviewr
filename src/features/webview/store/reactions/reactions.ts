import { attemptDetached } from '@utils/attempt';
import { StoreSliceId } from '../definitions';
import type { StoreReaction } from '../types';

const decodeNewSourcesReaction: StoreReaction = (store) => {
  const sources = store.get(StoreSliceId.Sources);
  const images = store.get(StoreSliceId.Images);
  const decodeOptions = store.get(StoreSliceId.DecodeOptions);
  const decodeSources = () => {
    attemptDetached(
      async () => {
        const newSources = Array.from(sources.getState().byId.entries()).map(([, source]) => source);

        // Trigger decoding of new sources in the images slice
        await images.decodeFromSource(newSources, undefined, decodeOptions.getState());
      },
      (error) => {
        const message = error instanceof Error ? error.message : String(error);

        store.bus.emit("images:error", { message });
      }
    );
  }

  const disposables = [
    store.bus.on("sources:change", decodeSources),
    store.bus.on("decodeOptions:change", decodeSources),
  ];

  return { dispose: () => disposables.forEach((dispose) => dispose()) };
}

/**
 * The idea of reactions is to provide a scoped tool
 * for cross-slice interaction without exposing the implementation details of each slice
 * And without polluting the slices and store itself with cross-slice logic.
 */
export const STORE_REACTIONS: readonly StoreReaction[] = [decodeNewSourcesReaction];
