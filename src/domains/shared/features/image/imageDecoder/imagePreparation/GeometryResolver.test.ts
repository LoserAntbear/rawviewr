import { describe, expect, it } from 'vitest';

import { imagFile } from '@root/test/fixtures/imag';
import { PixelFormatPresets } from '@SHARED/features/image/format/presets';

import { DEFAULT_DECODE_OPTIONS, HeaderPreset } from '../definitions';
import type { DecodeOptions } from '../types';

import { GeometryResolver } from './GeometryResolver';

const resolver = new GeometryResolver();

const options = (overrides: Partial<DecodeOptions> = {}): DecodeOptions => ({
  ...DEFAULT_DECODE_OPTIONS,
  ...overrides,
});

/**
 * Guessing is the path a headerless buffer takes when the user has named no width, and the
 * guesser refuses to rank anything under a handful of pixels. What is left of the buffer then
 * still has to come out as a geometry a decoder can use, so the width falls back to 1 rather
 * than to a hole — and only the width, because the height is derived from what the buffer has
 * left over either way.
 */
describe('GeometryResolver.resolveGeometry', () => {
  it('falls back to a one-pixel row when the buffer is too small to guess at', () => {
    // 4 bytes at 16 bpp is 2 pixels, under the guesser's minimum, so it ranks nothing.
    const geometry = resolver.resolveGeometry(new Uint8Array(4), options({ width: 0, height: 0 }));

    // 1 wide is the fallback; 2 tall is the 4 bytes divided by the 2 a single pixel takes.
    expect([geometry.width, geometry.height]).toEqual([1, 2]);
  });

  it('takes the best guess when there is one, rather than the fallback', () => {
    const geometry = resolver.resolveGeometry(new Uint8Array(32), options({ width: 0, height: 0 }));

    expect(geometry.width).toBeGreaterThan(1);
  });
});

/**
 * A compressed file sizes itself, and its offsets count into what it decompresses to: one
 * frame, packed tight. Nothing the user typed can move that, so nothing they typed is read.
 */
describe('GeometryResolver.resolveGeometry: a compressed format', () => {
  const imag = PixelFormatPresets.getPreset('imag');

  it('takes the size from the file, and lays out one tight frame from offset 0', () => {
    const geometry = resolver.resolveGeometry(imagFile(5, 3), options({ format: imag }));

    expect(geometry).toEqual({
      width: 5,
      height: 3,
      frameCount: 1,
      bytesPerRow: 10,
      bytesPerFrame: 30,
      availableBytes: 30,
      baseOffset: 0,
      lockedByHeader: true,
    });
  });

  it('ignores the size, offset, stride and header preset it was given', () => {
    const given = options({
      format: imag,
      width: 64,
      height: 64,
      offset: 12,
      bytesPerRow: 512,
      headerPreset: HeaderPreset.U32BE,
    });

    expect(resolver.resolveGeometry(imagFile(5, 3), given))
      .toEqual(resolver.resolveGeometry(imagFile(5, 3), options({ format: imag })));
  });
});
