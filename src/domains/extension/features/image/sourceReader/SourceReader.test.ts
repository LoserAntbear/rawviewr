import { describe, expect, it } from 'vitest';

import { Endian } from '@definitions/bits';
import { imagFile, literal } from '@root/test/fixtures/imag';
import { PixelFormatPresets } from '@SHARED/features/image/format/presets';

import { SourceReader } from './SourceReader';

/**
 * A pinned pixel shows the bytes its colour was decoded from. The location was worked out in
 * the view against the decoder's pixel buffer, so the host has to read that same buffer — the
 * file itself for a raw layout, the decompressed words for a compressed one.
 */

const reader = new SourceReader();
const word = (byteOffset: number) => ({ bits: 16, bitOffset: 0, byteOffset }) as const;

describe('SourceReader.read', () => {
  it('reads a raw layout straight from the file, in the byte order asked for', () => {
    const file = new Uint8Array([0x00, 0x00, 0x12, 0x34]);

    expect(reader.read(file, word(2), Endian.Big, PixelFormatPresets.getPreset('rgba4444')))
      .toEqual({ bytes: [0x12, 0x34], value: 0x1234 });
  });

  it('reads a compressed format from what it decompresses to, not from the file', () => {
    // Pixel 1 decompresses to offset 2; in the file, offset 2 is still inside the header.
    const file = imagFile(2, 1, literal(0x1111, 0xabcd));

    expect(reader.read(file, word(2), Endian.Little, PixelFormatPresets.getPreset('imag')))
      .toEqual({ bytes: [0xcd, 0xab], value: 0xabcd });
  });

  it('reads little-endian where the format has no byte-order question to answer', () => {
    const file = imagFile(2, 1, literal(0x1111, 0xabcd));

    expect(reader.read(file, word(2), Endian.Big, PixelFormatPresets.getPreset('imag')))
      .toMatchObject({ value: 0xabcd });
  });
});
