import type { HeaderPreset, AlphaMode, Endian } from './definitions';

export type DecodeOptions = {
  frame: number; /** --- Which frame of a multi-frame buffer to decode. */
  width: number; /** --- Pixels per row. 0 asks the caller to fall back to a guess. */
  height: number; /** --- Rows per frame. 0 means "all remaining rows". */
  offset: number;
  format: string;
  stride: number; /** --- Bytes per row including padding. 0 = tightly packed. */
  flipY: boolean;
  endian: Endian; // FIXME: Remove the flag, convert to endiann-ess of the host machine if needed
  bitOrderMsb: boolean;
  alphaMode: AlphaMode;
  unpremultiply: boolean;
  headerPreset: HeaderPreset;
};

/**
 * Initially decoded to RGBA8888, row-major, top-left origin.
 * The caller can then convert to whatever format they want.
 */
export type DecodedImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};
