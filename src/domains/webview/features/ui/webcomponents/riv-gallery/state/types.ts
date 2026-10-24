import type { ContentViewMode, ViewerBackground } from '@SHARED/features/viewer';

export type GalleryState = {
  readonly zoom: number;
  readonly tileSize: number;
  readonly mode: ContentViewMode;
  readonly selectedId: string | null;
  readonly imageIds: readonly string[];
  readonly background: ViewerBackground;
};
