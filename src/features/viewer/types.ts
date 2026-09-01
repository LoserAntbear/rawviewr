import type { ViewerBackground } from './definitions';

export type ViewerConfiguration = {
  tileSize: number;
  background: ViewerBackground; // FIXME: Should this be an enum?
};
