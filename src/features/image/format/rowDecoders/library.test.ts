import { describe, expect, it } from 'vitest';

import { Endian } from '@definitions/bits';

import type { RowOptions } from '../types';
import { getRowDecoder, ROW_DECODERS } from './library';
import { FORMAT_DEFINITIONS } from '../definitions';

/**
 * One row per kind of format, read straight from the library — the formats themselves are
 * data and carry none of this.
 */

const LITTLE_MSB: RowOptions = { endian: Endian.Little, bitOrderMsb: true };

const row = (id: string, bytes: number[], pixels = 1, options: RowOptions = LITTLE_MSB) =>
  [...getRowDecoder(id)(new Uint8Array(bytes), 0, pixels, options)];

describe('row decoders', () => {
  it.each([
    // rgba4444 little endian: opaque red is 0xF00F, stored as [0x0f, 0xf0].
    ['packed', 'rgba4444', [0x0f, 0xf0], [255, 0, 0, 255]],
    ['byte ordered', 'rgb888', [1, 2, 3], [1, 2, 3, 255]],
    ['sub-byte gray', 'gray1', [0b10000000], [255, 255, 255, 255]],
    ['gray', 'gray8', [0x80], [128, 128, 128, 255]],
    ['alpha only', 'alpha8', [0x40], [255, 255, 255, 0x40]],
  ])('reads a %s format', (_kind, id, bytes, expected) => {
    expect(row(id, bytes)).toEqual(expected);
  });

  it('reads sub-byte pixels from the other end when the bit order says so', () => {
    expect(row('gray1', [0b00000001], 1, { ...LITTLE_MSB, bitOrderMsb: false })).toEqual([255, 255, 255, 255]);
  });

  it('gives transparent black for pixels past the end of the buffer, rather than throwing', () => {
    expect(row('rgb888', [1, 2, 3], 2)).toEqual([1, 2, 3, 255, 0, 0, 0, 0]);
  });

  it('has one decoder for every format there is', () => {
    expect([...ROW_DECODERS.keys()].sort()).toEqual(FORMAT_DEFINITIONS.map(({ id }) => id).sort());
  });

  it('refuses an id it has no decoder for, rather than returning nothing', () => {
    expect(() => getRowDecoder('nonesuch')).toThrow('No row decoder for pixel format "nonesuch"');
  });
});
