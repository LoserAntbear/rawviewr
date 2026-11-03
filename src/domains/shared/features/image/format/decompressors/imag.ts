import { Endian } from '@definitions/bits';
import { readWord } from '@utils/bits';

import type { Decompressor, PackedChannels } from '../types';

import { EmptyImagError, ImagFormatError } from './errors';

/**
 * .imag sprites: a small header, then ARGB4444 pixels compressed with LZ77 back-references.
 *
 * Layout (little-endian):
 *   0x00  u16  width   (0×0 sprites exist: a header and nothing else)
 *   0x02  u16  height
 *   0x04  u16  1 (always 1 in the samples; meaning unknown)
 *   0x06  ...  zeros up to 0x10
 *   0x10  i16  x, 0x12 i16 y — signed, often non-zero; probably an anchor point, not needed here
 *   0x14  token stream
 *
 * Tokens are two bytes, (count, dist):
 *   dist == 0  ->  count+1 literal u16 pixels follow
 *   dist  > 0  ->  copy count+1 pixels starting `dist` pixels back
 *                  (may overlap: dist=1 repeats the previous pixel)
 *
 * A byte of 0xff in either place means the value did not fit, and the real one follows the
 * token, wider — the count first, then the distance:
 *   count == 0xff  ->  a u32 follows, and is the run itself (no +1)
 *   dist  == 0xff  ->  a u16 follows, and is the distance
 *
 * Some files can carry more data after the image (Probably animations (?))
 * Leaving them be for now
 */

const PIXEL_BYTES = 2;
const TOKEN_BYTES = 2;
const HEADER_SIZE = 0x14;

const WIDE_VALUE = 0xff;
const WIDE_COUNT_BYTES = 4;
const WIDE_DISTANCE_BYTES = 2;

export const IMAG_CHANNELS: PackedChannels = {
  r: { shift: 8, bits: 4 },
  g: { shift: 4, bits: 4 },
  b: { shift: 0, bits: 4 },
  a: { shift: 12, bits: 4 },
};

type Token = {
  run: number; /** --- Pixels the token produces. */
  end: number; /** --- Offset just past the token and any wide values. */
  distance: number; /** --- How far back a copy reads; 0 for a literal run, whose pixels follow. */
};

function hex(offset: number): string {
  return `0x${offset.toString(16)}`;
}

function readToken(source: Uint8Array, at: number): Token {
  const count = source[at];
  const distance = source[at + 1];
  const countBytes = count === WIDE_VALUE ? WIDE_COUNT_BYTES : 0;
  const distanceBytes = distance === WIDE_VALUE ? WIDE_DISTANCE_BYTES : 0;
  const countAt = at + TOKEN_BYTES;
  const distanceAt = countAt + countBytes;
  const end = distanceAt + distanceBytes;

  if (end > source.length) {
    throw new ImagFormatError(`token at ${hex(at)} is cut off by the end of the file`);
  }

  const token = {
    end,
    run: countBytes ? readWord(source, countAt, countBytes, Endian.Little) : count + 1,
    distance: distanceBytes ? readWord(source, distanceAt, distanceBytes, Endian.Little) : distance,
  };

  // Zero is what marks a literal run, so a copy cannot be widened into one.
  if (distanceBytes && token.distance === 0) {
    throw new ImagFormatError(`token at ${hex(at)} copies from a distance of 0`);
  }

  return token;
}

/** The size alone, from the header — so geometry is known without decompressing anything. */
export function readImagSize(source: Uint8Array): { width: number; height: number } {
  if (source.length < HEADER_SIZE) {
    throw new ImagFormatError(`file is ${source.length} bytes, shorter than the ${HEADER_SIZE}-byte header`);
  }

  const width = readWord(source, 0, 2, Endian.Little);
  const height = readWord(source, 2, 2, Endian.Little);

  if (width === 0 || height === 0) {
    throw new EmptyImagError(width, height);
  }

  return { width, height };
}

export function decompressImag(source: Uint8Array): Uint8Array {
  const { width, height } = readImagSize(source);
  const total = width * height;
  const pixels = new Uint8Array(total * PIXEL_BYTES);

  let out = 0;
  let at = HEADER_SIZE;

  while (out < pixels.length) {
    if (at + TOKEN_BYTES > source.length) {
      throw new ImagFormatError(`stream ended after ${out / PIXEL_BYTES} of ${total} pixels`);
    }

    const { run, distance, end } = readToken(source, at);
    const runBytes = run * PIXEL_BYTES;
    const distBytes = distance * PIXEL_BYTES;

    if (out + runBytes > pixels.length) {
      throw new ImagFormatError(
        `token at ${hex(at)} overruns the image (${out / PIXEL_BYTES} + ${run} > ${total})`,
      );
    }

    if (distBytes === 0) {
      if (end + runBytes > source.length) {
        throw new ImagFormatError(`literal run at ${hex(at)} runs past end of file`);
      }

      pixels.set(source.subarray(end, end + runBytes), out);
      at = end + runBytes;
    } else {
      if (distBytes > out) {
        throw new ImagFormatError(`token at ${hex(at)} copies from before the image start`);
      }

      // Byte by byte, not `copyWithin`: an overlapping copy has to repeat what it has just
      // written, where `copyWithin` would copy the bytes as they were before it started.
      for (let byte = out; byte < out + runBytes; byte++) {
        pixels[byte] = pixels[byte - distBytes];
      }

      at = end;
    }

    out += runBytes;
  }

  return pixels;
}

export const IMAG_DECOMPRESSOR: Decompressor = {
  readSize: readImagSize,
  decompress: decompressImag,
};
