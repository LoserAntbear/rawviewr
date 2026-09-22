import { attemptDetached } from '@utils/attempt';
import { StoreSliceId } from '../definitions';
import type { StoreReaction } from '../types';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';

const decodeNewSourcesReaction: StoreReaction = (store) => {
  const sources = store.get(StoreSliceId.Sources);
  const images = store.get(StoreSliceId.Images);

  const dispose = store.bus.on("sources:change", () => {
    attemptDetached(
      async () => {
        const newSources = Array.from(sources.getState().byId.entries()).map(([, source]) => source);

        // Trigger decoding of new sources in the images slice
        await images.decodeFromSource(newSources);
      },
      (error) => {
        const message = error instanceof Error ? error.message : String(error);

        InfoMessageController.showError(message);
      }
    );
  });

  return { dispose };
}

/**
 * The idea of reactions is to provide a scoped tool
 * for cross-slice interaction without exposing the implementation details of each slice
 * And without polluting the slices and store itself with cross-slice logic.
 */
export const STORE_REACTIONS: readonly StoreReaction[] = [decodeNewSourcesReaction];
