/**
 * Builds .imag files byte by byte, so a test states the stream it means rather than
 * pointing at a sample. See `format/decompressors/imag.ts` for the layout.
 */

const HEADER_SIZE = 0x14;
const WIDE_VALUE = 0xff;

function word(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function dword(value: number): number[] {
  return [...word(value & 0xffff), ...word(value >>> 16)];
}

/** `pixels.length` literal pixels, in one short token — up to 255 of them. */
export function literal(...pixels: number[]): number[] {
  return [pixels.length - 1, 0, ...pixels.flatMap(word)];
}

/**
 * `run` pixels copied from `dist` pixels back — overlapping when `dist < run`. Encoded the way
 * the samples are: a run over 255 or a distance of 255 and up goes wide, count before distance.
 */
export function copy(run: number, dist: number): number[] {
  const wideRun = run > 255;
  const wideDist = dist >= WIDE_VALUE;

  return [
    wideRun ? WIDE_VALUE : run - 1,
    wideDist ? WIDE_VALUE : dist,
    ...(wideRun ? dword(run) : []),
    ...(wideDist ? word(dist) : []),
  ];
}

export function imagFile(width: number, height: number, ...tokens: number[][]): Uint8Array {
  const header = new Array<number>(HEADER_SIZE).fill(0);

  header.splice(0, 4, ...word(width), ...word(height));
  header.splice(4, 2, ...word(1));

  return new Uint8Array([...header, ...tokens.flat()]);
}

/** Pixel words as little-endian bytes: what a decompressed buffer holds. */
export function wordsLE(...pixels: number[]): number[] {
  return pixels.flatMap(word);
}
