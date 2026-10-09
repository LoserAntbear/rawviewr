import type { ZoomDirection } from '@features/zoom';
import { DEFAULT_VIEWER_BACKGROUND } from '@features/viewer/definitions';
import type { ViewerBackground } from '@features/viewer/definitions';

import type { GalleryViewMode } from '../../../ui/webcomponents/types';

import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import { ZOOM } from './definitions';
import type { ViewState } from './types';
import { resolveZoom } from './utils';

/**
 * Keeps and handles only the data related to the view state of the current presenter:
 * modes: 'single' | 'gallery', etc.
 */
export class ViewSlice extends StoreSlice<StoreSliceId.View, ViewState> {
  constructor() {
    super(StoreSliceId.View, { mode: 'single', zoom: ZOOM.default, background: DEFAULT_VIEWER_BACKGROUND });
  }

  public get mode(): GalleryViewMode {
    return this.getState().mode;
  }

  public get zoom(): number {
    return this.getState().zoom;
  }

  public get background(): ViewerBackground {
    return this.getState().background;
  }

  public setBackground(background: ViewerBackground): void {
    this.patch({ background });
  }

  public setMode(mode: GalleryViewMode): void {
    this.patch({ mode });
  }

  public setZoom(direction: ZoomDirection): void {
    this.patch({ zoom: resolveZoom(this.zoom, direction) });
  }
}
