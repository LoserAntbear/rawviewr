import { describe, expect, it } from 'vitest';

import { Endian } from '@definitions/bits';

import { FormatDecodersLibrary } from './library';

/**
 * 4:4:4 shares nothing: three bytes in, one pixel out. What can still go wrong is the byte
 * order — `yuv444` and `vuy444` are the same samples read from opposite ends, so reading one as
 * the other swaps luma for red chroma and the picture comes out unrecognisable but not blank.
 */
const options = { endian: Endian.Little, bitOrderMsb: true };

/** Red, at its BT.601 studio-swing encoding. */
const [RED_Y, RED_U, RED_V] = [81, 90, 240];

const decode = (id: string, bytes: number[], pixelCount: number): number[] =>
  [...FormatDecodersLibrary.getRowDecoder(id)(new Uint8Array(bytes), 0, pixelCount, options)];

describe('packed YUV 4:4:4', () => {
  it.each([
    ['yuv444', [RED_Y, RED_U, RED_V]],
    ['vuy444', [RED_V, RED_U, RED_Y]],
  ])('%s reads its samples from the right bytes', (id, bytes) => {
    expect(decode(id, bytes, 1)).toEqual([255, 0, 0, 255]);
  });

  /** The two orders are mirror images, so one read as the other is visibly wrong. */
  it('does not read one order as the other', () => {
    expect(decode('vuy444', [RED_Y, RED_U, RED_V], 1)).not.toEqual([255, 0, 0, 255]);
  });

  it('gives every pixel its own chroma, unlike 4:2:2', () => {
    const row = decode('yuv444', [RED_Y, RED_U, RED_V, 126, 128, 128], 2);

    expect(row.slice(0, 4)).toEqual([255, 0, 0, 255]);
    expect(row.slice(4)).toEqual([128, 128, 128, 255]);
  });

  it('advances three bytes a pixel', () => {
    expect(decode('yuv444', new Array(12).fill(0).map((_, i) => (i % 3 === 0 ? 235 : 128)), 4))
      .toEqual(new Array(4).fill([255, 255, 255, 255]).flat());
  });

  it('leaves a pixel blank when its three bytes run past the buffer', () => {
    // Two bytes cannot hold a pixel.
    expect(decode('yuv444', [RED_Y, RED_U], 1)).toEqual([0, 0, 0, 0]);
  });

  it('leaves every pixel opaque, since 4:4:4 here carries no alpha', () => {
    expect(decode('yuv444', [RED_Y, RED_U, RED_V], 1)[3]).toBe(255);
  });
});
