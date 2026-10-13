import { describe, expect, it } from 'vitest';

import { DEFAULT_DECODE_OPTIONS } from './definitions';
import { ImageDecoder } from './ImageDecoder';
import { DecodedSizeExceededError } from './decodeErrors';
import type { DecodeOptions } from './types';

const decoder = new ImageDecoder();

/** The options carry the format itself; rgba4444 is the default, and what these decode. */
const options = (overrides: Partial<DecodeOptions> = {}): DecodeOptions => ({
  ...DEFAULT_DECODE_OPTIONS,
  ...overrides,
});

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
    const { image } = decoder.decode(opaqueRedRgba4444(12), options({ width: 4, height: 3 }));

    expect([image.width, image.height, image.data.length]).toEqual([4, 3, 48]);
    expect([...image.data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...image.data.slice(-4)]).toEqual([255, 0, 0, 255]);
  });

  it('returns ArrayBuffer-backed pixels, which is what `ImageData` requires', () => {
    const { image } = decoder.decode(opaqueRedRgba4444(4), options());

    expect(image.data.buffer).toBeInstanceOf(ArrayBuffer);
  });

  it('derives a geometry when no width is given, rather than throwing', () => {
    const { image } = decoder.decode(opaqueRedRgba4444(12), options({ width: 0, height: 0 }));

    expect(image.width * image.height).toBe(12);
  });
});

/**
 * The crash this exists for: a header preset that does not match the file reads garbage as
 * 65535×65535. Both dimensions pass their own range check, and the product is 4.29 billion
 * pixels — 16 GiB of RGBA, allocated twice, in a utility process that has nothing like it.
 */
describe('ImageDecoder: what it refuses to allocate', () => {
  const geometry = (width: number, height: number) => ({
    width,
    height,
    frameCount: 1,
    bytesPerRow: Math.ceil((width * 16) / 8),
    bytesPerFrame: Math.ceil((width * 16) / 8) * height,
    availableBytes: 24,
    baseOffset: 0,
    lockedByHeader: true,
  });
  /**
   * Asserted as a throw rather than by watching memory: a test that measures the allocation
   * has to let it happen first, and with this guard removed that is 16 GiB inside the suite.
   */
  it('refuses a frame past the budget, naming what asked for it', () => {
    expect(() => decoder.decode(new Uint8Array(24), options(), geometry(65535, 65535)))
      .toThrow(/65535×65535 is 4294836225 pixels/);
  });

  it('refuses a product that is absurd though each side is in range', () => {
    // Each dimension is inside MAX_FILE_DIMENSION_PX; only the area gives it away.
    expect(() => decoder.decode(new Uint8Array(24), options(), geometry(60000, 60000)))
      .toThrow(DecodedSizeExceededError);
  });

  it('decodes what is within the budget, however short the buffer is', () => {
    const decoded = decoder.decode(new Uint8Array(24), options(), geometry(64, 64));

    // A buffer smaller than its frame is padded, which is a warning rather than a refusal.
    expect(decoded.image.data.byteLength).toBe(64 * 64 * 4);
  });

  it('allows a frame at the budget exactly', () => {
    expect(() => decoder.decode(new Uint8Array(24), options(), geometry(8192, 8192))).not.toThrow();
  });
});
