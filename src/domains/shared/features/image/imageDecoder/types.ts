import type { Endian } from '@definitions/bits';
import type { PixelFormat } from '@SHARED/features/image/format/types';

import type { AlphaMode, HeaderPreset } from './definitions';
import type { Geometry } from './imagePreparation/types';

export type SegmentedImage = {
  readonly width: number;
  readonly height: number;
  readonly segments: readonly DecodedSegment[];
};
export type SegmentedPixel = {
  readonly offset: number;
  readonly data: Uint8ClampedArray<ArrayBuffer>;
};

export type DecodeOptions = {
  frame: number; /** --- Which frame of a multi-frame buffer to decode. */
  width: number; /** --- Pixels per row. 0 asks the caller to fall back to a guess. */
  height: number; /** --- Rows per frame. 0 means "all remaining rows". */
  offset: number;
  flipY: boolean;
  endian: Endian;
  format: PixelFormat;
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
 *
 * DISCLAIMER: CAN BE A PART OF AN IMAGE, e.g., when decoding progressively.
 */
export type DecodedImage = {
  width: number;
  height: number;
  /**
   * Explicitly backed by an `ArrayBuffer`, which is what the decoder allocates.
   * `ImageData`'s constructor rejects the buffer-agnostic `Uint8ClampedArray`.
   */
  data: Uint8ClampedArray<ArrayBuffer>;
};

export type DecodedFileStart = {
  readonly status: 'start';

  readonly runId: string;
  readonly id: string;
  readonly name: string;
  readonly byteLength: number;
  readonly geometry: Geometry;
  readonly detail: string | null;
};
export type DecodedFileSegment = {
  readonly status: 'progress';

  readonly id: string;
  readonly runId: string;
  readonly segment: DecodedSegment;
};

// Success is sent as a FINAL confirmation of decoding sequence/decoding call
// Thus it implies that all the data is already received via `progress` updates.
export type DecodedFileSuccess = {
  readonly status: 'success';

  readonly id: string;
  readonly runId: string;
};

export type DecodedFileFailure = {
  readonly status: 'failure';

  readonly id: string;
  readonly message: string;
};

export type DecodedFileInterruption = {
  readonly status: 'interruption';

  readonly id: string;
  readonly runId: string;
};

export type DecodedFileSource = DecodedFileStart | DecodedFileSegment | DecodedFileOutcome;
export type DecodedFileOutcome = DecodedFileSuccess | DecodedFileFailure | DecodedFileInterruption;

export type DecodedSegment = {
  readonly row: number;
  readonly totalRows: number;
  readonly data: Uint8ClampedArray<ArrayBuffer>;
};

export type DecodedArrayBuffer = {
  geometry: Geometry;
  image: DecodedImage;
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
