import { ViewerBackground } from '@features/viewer/definitions';

type Backdrop = {
  readonly color: string;
  readonly pattern: string;
};

export const BACKDROPS: Readonly<Record<ViewerBackground, Backdrop | null>> = {
  [ViewerBackground.checker]: null,
  [ViewerBackground.black]: { color: '#000000', pattern: 'none' },
  [ViewerBackground.white]: { color: '#ffffff', pattern: 'none' },
  [ViewerBackground.magenta]: { color: '#ff00ff', pattern: 'none' },
  [ViewerBackground.editor]: { color: 'transparent', pattern: 'none' },
};
