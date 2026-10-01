import type { GalleryViewMode } from '../../../ui/webcomponents/types';

export type ZoomDirection = 'in' | 'out' | 'reset';

export type ViewState = {
  readonly zoom: number;
  readonly mode: GalleryViewMode;
};
