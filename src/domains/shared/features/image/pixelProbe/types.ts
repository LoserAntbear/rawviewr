import type { Vector2 } from '@definitions/geometry';
import type { SourceLocation } from '@SHARED/features/image/sourceReader/types';

export type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type PixelSample = {
  readonly rgba: Rgba;
  readonly position: Vector2;
  readonly location: SourceLocation;
};
