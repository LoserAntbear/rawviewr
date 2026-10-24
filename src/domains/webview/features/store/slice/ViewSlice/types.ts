import type { ContentViewMode, ViewerBackground } from '@SHARED/features/viewer';

export type ViewState = {
  readonly zoom: number;
  readonly mode: ContentViewMode;
  readonly background: ViewerBackground;
};
