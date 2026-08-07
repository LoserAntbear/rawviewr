import type { Endian } from '@definitions/bits';

import type { HeaderPreset, AlphaMode } from './definitions';
import { Geometry } from './imagePreparation/types';

export type DecodeOptions = {
  frame: number; /** --- Which frame of a multi-frame buffer to decode. */
  width: number; /** --- Pixels per row. 0 asks the caller to fall back to a guess. */
  height: number; /** --- Rows per frame. 0 means "all remaining rows". */
  offset: number;
  format: string;
  flipY: boolean;
  endian: Endian;
  bytesPerRow: number; /** --- Bytes per row including padding. 0 = tightly packed. */
  bitOrderMsb: boolean;
  alphaMode: AlphaMode;
  unpremultiply: boolean;
  headerPreset: HeaderPreset;
};

/**
 * Decoded to RGBA8888, row-major, top-left origin — and self-contained, so
 * anything that only wants pixels needs nothing else to use them.
 * The caller can then convert to whatever format they want.
 */
export type DecodedImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

/**
 * Pixel probing needs all three to relate a pixel back to its bytes;
 * canvas needs only `image`.
 */
export type DecodeResult = {
  source: Uint8Array;
  geometry: Geometry;
  image: DecodedImage;
};
