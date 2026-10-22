import type { ContentViewMode, ViewerBackground } from '@features/viewer';

export type ViewState = {
  readonly zoom: number;
  readonly mode: ContentViewMode;
  readonly background: ViewerBackground;
};
