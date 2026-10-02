import type { GalleryViewMode } from '../../../ui/webcomponents/types';

export type ViewState = {
  readonly zoom: number;
  readonly mode: GalleryViewMode;
};
