import { describe, expect, it } from 'vitest';

import { DEFAULT_DECODE_OPTIONS } from '../definitions';
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
