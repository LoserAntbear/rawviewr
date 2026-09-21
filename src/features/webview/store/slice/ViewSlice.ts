import type { GalleryViewMode } from '../../ui/webcomponents/types';

import { StoreSliceId } from '../definitions';
import { StoreSlice } from './StoreSlice';
import type { StoreSliceEventMap } from './types';

export type ViewState = {
  readonly mode: GalleryViewMode;
  readonly selectedId: string | null;
};
export type ViewSliceEvents = StoreSliceEventMap<StoreSliceId.View, ViewState>;

export class ViewSlice extends StoreSlice<StoreSliceId.View, ViewState> {
  constructor() {
    super(StoreSliceId.View, { mode: 'single', selectedId: null });
  }

  public get mode(): GalleryViewMode {
    return this.getState().mode;
  }

  public get selectedId(): string | null {
    return this.getState().selectedId;
  }

  public setMode(mode: GalleryViewMode): void {
    this.patch({ mode });
  }

  public select(selectedId: string | null): void {
    this.patch({ selectedId });
  }
}
