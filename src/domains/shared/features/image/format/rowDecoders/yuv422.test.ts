import { describe, expect, it } from 'vitest';

import { Endian } from '@definitions/bits';

import { FormatDecodersLibrary } from './library';

/**
 * The four packed 4:2:2 layouts differ only in where the samples sit inside the four-byte
 * group. Swap U and V and every picture comes out with its colours rotated but its shapes
 * intact — so each layout is driven with the same two pixels and has to agree.
 */
const options = { endian: Endian.Little, bitOrderMsb: true };

/** Red then blue, at their BT.601 studio-swing encodings, sharing red's chroma. */
const RED_Y = 81;
const BLUE_Y = 41;
const SHARED_U = 90;
const SHARED_V = 240;

const groups: Record<string, number[]> = {
  yuyv: [RED_Y, SHARED_U, BLUE_Y, SHARED_V],
  uyvy: [SHARED_U, RED_Y, SHARED_V, BLUE_Y],
  yvyu: [RED_Y, SHARED_V, BLUE_Y, SHARED_U],
  vyuy: [SHARED_V, RED_Y, SHARED_U, BLUE_Y],
};

const decode = (id: string, bytes: number[], pixelCount: number): number[] =>
  [...FormatDecodersLibrary.getRowDecoder(id)(new Uint8Array(bytes), 0, pixelCount, options)];

describe('packed YUV 4:2:2', () => {
  it.each(Object.keys(groups))('%s reads its samples from the right bytes', (id) => {
    const [r0, g0, b0, a0, r1, g1, b1, a1] = decode(id, groups[id]!, 2);

    // The first pixel is red; the second shares its chroma but carries blue's luma, so it is
    // the same hue, darker — which is exactly what sharing chroma across a pair looks like.
    expect([a0, a1]).toEqual([255, 255]);
    expect(r0).toBeGreaterThan(200);
    expect(g0! + b0!).toBeLessThan(40);
    expect(r1!).toBeLessThan(r0!);
    expect(g1! + b1!).toBeLessThan(40);
  });

  /** The whole point of 4:2:2: one chroma pair serves both pixels of the group. */
  it('gives both pixels of a group the same chroma', () => {
    const flat = decode('yuyv', [126, 90, 126, 240], 2);

    expect(flat.slice(0, 4)).toEqual(flat.slice(4, 8));
  });

  it('decodes two groups into four pixels', () => {
    expect(decode('yuyv', [...groups.yuyv!, ...groups.yuyv!], 4)).toHaveLength(16);
  });

  /**
   * An odd width ends on a group whose second pixel is not wanted. The row still has to be the
   * right length and the final pixel still has to be decoded — it is the partner that goes.
   */
  it('decodes the odd final pixel from its own group', () => {
    const grey = [126, 128, 128, 128];
    const row = decode('yuyv', [...groups.yuyv!, ...grey], 3);

    expect(row).toHaveLength(12);
    // Red, darker red, then the grey that opens the second group.
    expect(row.slice(8)).toEqual([128, 128, 128, 255]);
  });

  it('leaves the row blank when the group runs past the buffer', () => {
    // Three bytes cannot hold a four-byte group.
    expect(decode('yuyv', [RED_Y, SHARED_U, BLUE_Y], 2)).toEqual(new Array(8).fill(0));
  });

  it('is registered for every layout, so the picker cannot offer an undecodable format', () => {
    for (const id of Object.keys(groups)) {
      expect(() => FormatDecodersLibrary.getRowDecoder(id)).not.toThrow();
    }
  });
});
