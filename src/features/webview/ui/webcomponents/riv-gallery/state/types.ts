import type { GalleryViewMode } from '../../types';

export type GalleryState = {
  readonly mode: GalleryViewMode;
  readonly selectedId: string | null;
  readonly visibleIds: readonly string[];
};
