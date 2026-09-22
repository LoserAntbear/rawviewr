import type { StoreSliceEventMap } from '../types';
import type { GalleryViewMode } from '../../../ui/webcomponents/types';
import type { StoreSliceId } from '../../definitions';

export type ViewState = {
  readonly mode: GalleryViewMode;
};
export type ViewSliceEvents = StoreSliceEventMap<StoreSliceId.View, ViewState>;
