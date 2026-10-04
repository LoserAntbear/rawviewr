import { describe, expect, it } from 'vitest';

import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { PixelFormatPresets } from '@features/image/format/presets';
import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';
import type { DecodedImage, DecodeOptions } from '@features/image/imageDecoder/types';

import { probePixel } from './PixelProbe';

/**
 * A reading answers two questions at once: what the pixel decoded to, and where in the file
 * its bits came from. The first is a lookup in the decoded pixels, the second is arithmetic
 * over the geometry — which is why neither needs the source bytes.
 */

/** 4x3, rgba4444: 2 bytes a pixel, 8 bytes a row. */
const geometry = (overrides: Partial<Geometry> = {}): Geometry => ({
  width: 4,
  height: 3,
  frameCount: 1,
  bytesPerRow: 8,
  bytesPerFrame: 24,
  availableBytes: 24,
  baseOffset: 0,
  lockedByHeader: false,
  ...overrides,
});

/** Each pixel carries its own index, so a misread lands on a recognisable value. */
function image(width = 4, height = 3): DecodedImage {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    data.set([index, index + 100, index + 200, 255], index * 4);
  }

  return { width, height, data };
}

const options = (overrides: Partial<DecodeOptions> = {}): DecodeOptions => ({
  ...DEFAULT_DECODE_OPTIONS,
  format: PixelFormatPresets.getPreset('rgba4444'),
  width: 4,
  height: 3,
  ...overrides,
});

describe('probePixel', () => {
  it('reads the pixel the position names, not its neighbour', () => {
    const sample = probePixel(image(), geometry(), options(), { x: 1, y: 2 });

    // Row 2, column 1 is index 9 of a 4-wide image.
    expect(sample?.rgba).toEqual({ r: 9, g: 109, b: 209, a: 255 });
  });

  it('points at the byte the pixel was decoded from', () => {
    const sample = probePixel(image(), geometry(), options(), { x: 3, y: 1 });

    // One row in (8 B) plus three pixels of two bytes.
    expect(sample?.location).toEqual({ bits: 16, bitOffset: 0, byteOffset: 14 });
  });

  it('counts rows from the bottom when the buffer is bottom-up', () => {
    const sample = probePixel(image(), geometry(), options({ flipY: true }), { x: 0, y: 0 });

    // The top row on screen is the last row in the file.
    expect(sample?.location.byteOffset).toBe(16);
  });

  it('skips the header the options declare', () => {
    const sample = probePixel(image(), geometry({ baseOffset: 32 }), options({ offset: 32 }), { x: 0, y: 0 });

    expect(sample?.location.byteOffset).toBe(32);
  });

  it('names the bit within the byte for a format that shares one', () => {
    const packed = options({ format: PixelFormatPresets.getPreset('gray2'), bitOrderMsb: true });
    const sample = probePixel(image(), geometry({ bytesPerRow: 1 }), packed, { x: 2, y: 0 });

    // Four pixels to the byte, MSB first: the third sits two bits from the top.
    expect(sample?.location).toEqual({ bits: 2, bitOffset: 2, byteOffset: 0 });
  });

  it('keeps the position it was asked about, so a reading can be compared', () => {
    expect(probePixel(image(), geometry(), options(), { x: 2, y: 1 })?.position).toEqual({ x: 2, y: 1 });
  });

  it.each([
    [{ x: 4, y: 0 }],
    [{ x: 0, y: 3 }],
    [{ x: -1, y: 0 }],
  ])('has nothing to report outside the image, at %o', (position) => {
    expect(probePixel(image(), geometry(), options(), position)).toBeNull();
  });
});
