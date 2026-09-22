import type { StoreSliceEventMap } from '../types';
import type { GalleryViewMode } from '../../../ui/webcomponents/types';
import type { StoreSliceId } from '../../definitions';

export type ViewState = {
  readonly mode: GalleryViewMode;
  readonly selectedId: string | null;
};
export type ViewSliceEvents = StoreSliceEventMap<StoreSliceId.View, ViewState>;
