import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { copy, imagFile, literal, wordsLE } from '@root/test/fixtures/imag';

import { EmptyImagError, ImagFormatError } from './errors';
import { decompressImag, readImagSize } from './imag';

/**
 * Decompressing gives back the pixel words exactly as the file would have stored them
 * uncompressed — little-endian ARGB4444 — so every expectation here is a list of words.
 */

const A = 0xaaaa;
const B = 0xbbbb;

describe('readImagSize', () => {
  it('reads the size from the header alone, with no stream behind it', () => {
    expect(readImagSize(imagFile(300, 2))).toEqual({ width: 300, height: 2 });
  });

  /** Seven of the sample files are exactly this: 20 bytes, no pixels. */
  it('tells an empty sprite apart from a broken file', () => {
    expect(() => readImagSize(imagFile(0, 0))).toThrow(EmptyImagError);
    expect(() => readImagSize(imagFile(0, 0))).toThrow('empty 0×0 sprite');
  });
});

describe('decompressImag: short tokens', () => {
  it('copies a literal run as it stands', () => {
    const file = imagFile(2, 2, literal(0x1111, 0x2222, 0x3333, 0x4444));

    expect([...decompressImag(file)]).toEqual(wordsLE(0x1111, 0x2222, 0x3333, 0x4444));
  });

  /**
   * The stream starts right after the header, at 0x14. Most files open with a one-pixel
   * literal there, which once passed for a "first pixel stored at 0x16" — until a file opened
   * with a longer run and its second pixel was read as a token.
   */
  it('starts the stream at 0x14, whatever the first token is', () => {
    const file = imagFile(3, 1, literal(0xf670, 0xf771, 0xf672));

    expect([...decompressImag(file)]).toEqual(wordsLE(0xf670, 0xf771, 0xf672));
  });

  it('repeats the previous pixel on a copy one pixel back', () => {
    const file = imagFile(4, 1, literal(0x1234), copy(3, 1));

    expect([...decompressImag(file)]).toEqual(wordsLE(0x1234, 0x1234, 0x1234, 0x1234));
  });

  /**
   * The case that rules out `copyWithin`: it copies the bytes as they stood before it began,
   * so the second half of this run would come out as zeros rather than repeating A B.
   */
  it('repeats what it has just written when a copy overlaps itself', () => {
    const file = imagFile(6, 1, literal(A, B), copy(4, 2));

    expect([...decompressImag(file)]).toEqual(wordsLE(A, B, A, B, A, B));
  });
});

/** A count or distance byte of 0xff says the real value follows the token, wider. */
describe('decompressImag: wide values', () => {
  it('reads a count of 0xff as "the run follows as a u32", taken as is', () => {
    // [ff 01] then 299 as a u32: one pixel, then 299 copies of it.
    const file = imagFile(300, 1, literal(A), [0xff, 0x01, 0x2b, 0x01, 0x00, 0x00]);

    expect([...decompressImag(file)]).toEqual(wordsLE(...new Array(300).fill(A)));
  });

  /** Some sprites have transparent stretches longer than a u16 can count. */
  it('takes all four bytes of the wide count', () => {
    const file = imagFile(7000, 10, literal(A), copy(69_999, 1));

    expect(new Uint16Array(decompressImag(file).buffer).every((pixel) => pixel === A)).toBe(true);
  });

  it('reads a distance of 0xff as "the distance follows as a u16"', () => {
    // A, then 255 of B; then [00 ff] and 256 as a u16 reaches back past every B to A.
    const file = imagFile(257, 1, literal(A, B), copy(254, 1), [0x00, 0xff, 0x00, 0x01]);
    const pixels = new Uint16Array(decompressImag(file).buffer);

    expect([pixels[0], pixels[255], pixels[256]]).toEqual([A, B, A]);
  });

  /** 0xff is the marker, so even a distance of exactly 255 is written wide. */
  it('reads 255 itself through the wide form, as the samples write it', () => {
    const file = imagFile(257, 1, literal(A, B), copy(254, 1), copy(1, 255));

    expect(new Uint16Array(decompressImag(file).buffer)[256]).toBe(B);
  });

  /** Never seen in the samples; the order follows the token's own — count, then distance. */
  it('reads both wide values, the count before the distance', () => {
    // Run 299 and distance 300 differ, so reading them in the wrong order lands elsewhere.
    const file = imagFile(599, 1, literal(A, B), copy(298, 1), copy(299, 300));
    const pixels = new Uint16Array(decompressImag(file).buffer);

    expect([...pixels.slice(299, 302)]).toEqual([B, A, B]);
  });
});

describe('decompressImag: the samples', () => {
  it('decompresses the sample sprite to one full frame', () => {
    const pixels = decompressImag(new Uint8Array(readFileSync('samples/gsausage.imag')));
    const words = new Uint16Array(pixels.buffer);

    expect(pixels.length).toBe(24 * 24 * 2);
    // A 55-pixel transparent run, then the first literals of the sprite's edge.
    expect([...words.slice(0, 55)].every((pixel) => pixel === 0)).toBe(true);
    expect([...words.slice(55, 59)]).toEqual([0x1000, 0x7000, 0x8000, 0xc000]);
  });

  /** Some files carry more data after the sprite; it is not part of the image. */
  it('stops at the last pixel, leaving whatever follows', () => {
    const file = imagFile(2, 1, literal(A, B), literal(0x1111));

    expect([...decompressImag(file)]).toEqual(wordsLE(A, B));
  });
});

describe('decompressImag: what it refuses', () => {
  it.each([
    ['a file shorter than the header', new Uint8Array(0x13), /shorter than the 20-byte header/],
    ['a stream that stops short', imagFile(3, 1, literal(A, B)), /stream ended after 2 of 3 pixels/],
    ['a token that runs past the image', imagFile(2, 1, literal(A), copy(2, 1)), /token at 0x18 overruns the image/],
    ['a literal run cut off by the end of the file', imagFile(3, 1, [2, 0, 0xff, 0xff]), /literal run at 0x14 runs past end of file/],
    ['a copy reaching before the first pixel', imagFile(3, 1, literal(A), copy(2, 2)), /token at 0x18 copies from before the image start/],
    ['a wide count cut off by the end of the file', imagFile(300, 1, literal(A), [0xff, 0x01, 0x2b]), /token at 0x18 is cut off/],
    ['a wide distance of 0', imagFile(2, 1, literal(A), [0x00, 0xff, 0x00, 0x00]), /token at 0x18 copies from a distance of 0/],
  ])('refuses %s, naming the file as not a valid .imag', (_label, file, detail) => {
    expect(() => decompressImag(file)).toThrow(ImagFormatError);
    expect(() => decompressImag(file)).toThrow(detail);
  });
});
