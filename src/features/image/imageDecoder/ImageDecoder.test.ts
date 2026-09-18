import { describe, expect, it } from 'vitest';

import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { FORMAT_PRESETS } from '@features/image/format/presets';

import { DEFAULT_DECODE_OPTIONS } from './definitions';
import { ImageDecoder } from './ImageDecoder';

const decoder = new ImageDecoder(new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format));

/**
 * rgba4444, little endian: R in bits 15..12 and A in 3..0 of each 16-bit word, so opaque
 * red is 0xF00F and sits in memory as [0x0F, 0xF0].
 */
function opaqueRedRgba4444(pixels: number): Uint8Array {
  const bytes = new Uint8Array(pixels * 2);

  for (let i = 0; i < pixels; i++) {
    bytes[i * 2] = 0x0f;
    bytes[i * 2 + 1] = 0xf0;
  }

  return bytes;
}

describe('ImageDecoder', () => {
  it('decodes rgba4444 to RGBA8888 with the requested geometry', () => {
    const { image } = decoder.decode(opaqueRedRgba4444(12), {
      ...DEFAULT_DECODE_OPTIONS,
      format: 'rgba4444',
      width: 4,
      height: 3,
    });

    expect([image.width, image.height, image.data.length]).toEqual([4, 3, 48]);
    expect([...image.data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...image.data.slice(-4)]).toEqual([255, 0, 0, 255]);
  });

  it('returns ArrayBuffer-backed pixels, which is what `ImageData` requires', () => {
    const { image } = decoder.decode(opaqueRedRgba4444(4), { ...DEFAULT_DECODE_OPTIONS, format: 'rgba4444' });

    expect(image.data.buffer).toBeInstanceOf(ArrayBuffer);
  });

  it('derives a geometry when no width is given, rather than throwing', () => {
    const { image } = decoder.decode(opaqueRedRgba4444(12), {
      ...DEFAULT_DECODE_OPTIONS,
      format: 'rgba4444',
      width: 0,
      height: 0,
    });

    expect(image.width * image.height).toBe(12);
  });
});
