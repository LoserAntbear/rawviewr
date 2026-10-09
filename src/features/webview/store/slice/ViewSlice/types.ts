import type { GalleryViewMode } from '../../../ui/webcomponents/types';

import type { ViewerBackground } from '@features/viewer/definitions';

export type ViewState = {
  readonly zoom: number;
  readonly mode: GalleryViewMode;
  readonly background: ViewerBackground;
};
