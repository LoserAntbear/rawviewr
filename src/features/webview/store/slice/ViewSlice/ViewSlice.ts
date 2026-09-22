import type { GalleryViewMode } from '../../../ui/webcomponents/types';

import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import { ViewState } from './types';

export class ViewSlice extends StoreSlice<StoreSliceId.View, ViewState> {
  constructor() {
    super(StoreSliceId.View, { mode: 'single' });
  }

  public get mode(): GalleryViewMode {
    return this.getState().mode;
  }

  public setMode(mode: GalleryViewMode): void {
    this.patch({ mode });
  }
}
