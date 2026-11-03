import { describe, expect, it } from 'vitest';

import { Endian } from '@definitions/bits';

import { PixelFormatPresets } from './presets';
import { resolveEndian } from './utils';

describe('resolveEndian', () => {
  it('follows the toggle where the format has a byte-order question', () => {
    expect(resolveEndian(PixelFormatPresets.getPreset('rgb565'), Endian.Big)).toBe(Endian.Big);
  });

  /** The toggle is disabled there, and a disabled control must not change what is read. */
  it.each(['imag', 'rgb888', 'gray8'])('reads %s little-endian whatever the toggle kept', (id) => {
    expect(resolveEndian(PixelFormatPresets.getPreset(id), Endian.Big)).toBe(Endian.Little);
  });
});
