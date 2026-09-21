import { resolveItemsGeometry } from './geometryReactions';
import type { StoreReaction } from '../types';

import { reconcileSelectedImages, decodeVisibleImages } from './imagesReactions';

/**
 * The idea of reactions is to provide a scoped tool
 * for cross-slice interaction without exposing the implementation details of each slice
 * And without polluting the slices and store itself with cross-slice logic.
 */
export const STORE_REACTIONS: readonly StoreReaction[] = [
  decodeVisibleImages,
  resolveItemsGeometry,
  reconcileSelectedImages,
];
