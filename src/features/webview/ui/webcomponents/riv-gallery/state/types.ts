import type { ViewerBackground } from '@features/viewer/definitions';

import type { GalleryViewMode } from '../../types';

export type GalleryState = {
  readonly zoom: number;
  readonly tileSize: number;
  readonly mode: GalleryViewMode;
  readonly selectedId: string | null;
  readonly background: ViewerBackground;
  readonly visibleIds: readonly string[];
};
