import { ViewerBackground } from '@features/viewer/definitions';
import { toStylePropertyList, type StylePropertyGroups } from '@features/webview/utils/styleProperties';

import type { GalleryState } from './state/types';

type Backdrop = {
  readonly color: string;
  readonly pattern: string;
};

export const BACKDROPS: Readonly<Record<ViewerBackground, Backdrop | null>> = {
  [ViewerBackground.checker]: null,
  [ViewerBackground.black]: { color: '#000000', pattern: 'none' },
  [ViewerBackground.white]: { color: '#ffffff', pattern: 'none' },
  [ViewerBackground.magenta]: { color: '#ff00ff', pattern: 'none' },
  [ViewerBackground.editor]: { color: 'transparent', pattern: 'none' },
};

const GALLERY_STYLE_PROPERTY_GROUPS: StylePropertyGroups<GalleryState> = {
  tile: [
    { name: '--riv-tile', resolve: ({ tileSize }) => `${tileSize}px` },
  ],
  zoom: [
    // Not `transform: scale()` on the list: that would scale the scrollbars with it.
    { name: '--riv-image-scale', resolve: ({ zoom }) => String(zoom) },
  ],
  backdrop: [
    { name: '--riv-image-backdrop', resolve: ({ background }) => BACKDROPS[background]?.color ?? null },
    { name: '--riv-image-backdrop-pattern', resolve: ({ background }) => BACKDROPS[background]?.pattern ?? null },
  ],
};

export const GALLERY_STYLE_PROPERTIES = toStylePropertyList(GALLERY_STYLE_PROPERTY_GROUPS);
