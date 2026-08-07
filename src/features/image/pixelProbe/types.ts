import type { Vector2 } from '@definitions/geometry';
import type { SourceBytes, SourceLocation } from '@features/image/sourceReader/types';

export type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type PixelSample = SourceLocation & SourceBytes & {
  rgba: Rgba;
  position: Vector2;
};
