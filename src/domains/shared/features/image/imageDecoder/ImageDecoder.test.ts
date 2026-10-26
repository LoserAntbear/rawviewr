import { describe, expect, it } from 'vitest';

import { PixelFormatPresets } from '@SHARED/features/image/format/presets';

import { DecodedSizeExceededError } from './decodeErrors';
import { AlphaMode, DEFAULT_DECODE_OPTIONS, DEFAULT_ROWS_PER_SEGMENT } from './definitions';
import { ImageDecoder } from './ImageDecoder';
import type { DecodedSegment, DecodeOptions } from './types';

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

/**
 * Three outcomes, not two. The branch that does *nothing* is the default — `alphaMode: 'use'`
 * with `unpremultiply: false` — and it was briefly lost when the two acting branches were
 * folded into a ternary, which silently unpremultiplied every image. Nothing in the suite
 * mentioned either option at the time, so 644 tests stayed green while mid-grey decoded white.
 *
 * rgba8888 is byte-ordered R,G,B,A, so the source reads the way it is written.
 * RGB 100 at alpha 250 scales to exactly 102 — short of the clamp, so a scaled channel is
 * distinguishable from a saturated one.
 */
describe('ImageDecoder: how the alpha options combine', () => {
  const TRANSLUCENT_THEN_OPAQUE = new Uint8Array([
    100, 100, 100, 250,
    100, 100, 100, 255,
  ]);

  const rgba8888 = (overrides: Partial<DecodeOptions> = {}): DecodeOptions => options({
    width: 2,
    height: 1,
    format: PixelFormatPresets.getPreset('rgba8888'),
    ...overrides,
  });

  const decodedWith = (overrides: Partial<DecodeOptions>): number[] =>
    [...decoder.decode(TRANSLUCENT_THEN_OPAQUE, rgba8888(overrides)).image.data];

  it('leaves the pixels alone on the default options', () => {
    expect(decodedWith({ alphaMode: AlphaMode.Use, unpremultiply: false }))
      .toEqual([100, 100, 100, 250, 100, 100, 100, 255]);
  });

  it('defaults to exactly that, so the shipped path is the untouched one', () => {
    expect(DEFAULT_DECODE_OPTIONS.alphaMode).toBe(AlphaMode.Use);
    expect(DEFAULT_DECODE_OPTIONS.unpremultiply).toBe(false);
  });

  it('forces every pixel opaque for `ignore`, and leaves the colour channels be', () => {
    expect(decodedWith({ alphaMode: AlphaMode.Ignore, unpremultiply: false }))
      .toEqual([100, 100, 100, 255, 100, 100, 100, 255]);
  });

  it('scales the colour channels only where alpha is partial', () => {
    // 100 × 255/250 = 102 for the translucent pixel; the opaque one is outside the range.
    expect(decodedWith({ alphaMode: AlphaMode.Use, unpremultiply: true }))
      .toEqual([102, 102, 102, 250, 100, 100, 100, 255]);
  });

  it('lets `ignore` win over `unpremultiply`, which is what the toolbar assumes', () => {
    // The toggle is disabled for `alphaMode: Ignore` (riv-toolbar/state/resolvers.ts), so
    // unpremultiplying against an alpha that is about to be discarded must not happen.
    expect(decodedWith({ alphaMode: AlphaMode.Ignore, unpremultiply: true }))
      .toEqual([100, 100, 100, 255, 100, 100, 100, 255]);
  });
});

/**
 * `decodeSource` is built on `decodeSegments`, so the whole-image and streamed paths share one
 * row loop and cannot drift. These pin that: whatever the band size, the bands reassemble into
 * the same image, and they tile it exactly once.
 */
describe('ImageDecoder.decodeSegments', () => {
  /** Four bytes a pixel, each row filled with its own index, so a misplaced band shows up. */
  function rowNumberedRgba8888(width: number, height: number): Uint8Array {
    const bytes = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      bytes.fill(y + 1, y * width * 4, (y + 1) * width * 4);
    }

    return bytes;
  }

  const rgba8888 = (overrides: Partial<DecodeOptions> = {}): DecodeOptions => options({
    width: 3,
    height: 7,
    format: PixelFormatPresets.getPreset('rgba8888'),
    ...overrides,
  });

  function concatenated(segments: readonly DecodedSegment[]): number[] {
    const total = segments.reduce((sum, { data }) => sum + data.length, 0);
    const joined = new Uint8ClampedArray(total);
    let at = 0;

    for (const { data } of segments) {
      joined.set(data, at);
      at += data.length;
    }

    return [...joined];
  }

  // 3 does not divide 7, so the last band is short — the case an even split would never reach.
  it.each([1, 2, 3, 7, 64])('reassembles into the whole image at a band of %i rows', (band) => {
    const source = rowNumberedRgba8888(3, 7);
    const segments = [...decoder.decodeSegments(source, rgba8888(), undefined, band)];

    expect(concatenated(segments)).toEqual([...decoder.decode(source, rgba8888()).image.data]);
  });

  it('tiles the height exactly once, with the short band last', () => {
    const segments = [...decoder.decodeSegments(rowNumberedRgba8888(3, 7), rgba8888(), undefined, 3)];

    expect(segments.map(({ row, totalRows }) => [row, totalRows])).toEqual([[0, 3], [3, 3], [6, 1]]);
  });

  it('sizes each band to its own rows, which is what `ImageData` requires', () => {
    const segments = [...decoder.decodeSegments(rowNumberedRgba8888(3, 7), rgba8888(), undefined, 3)];

    expect(segments.map(({ totalRows, data }) => data.length === totalRows * 3 * 4)).toEqual([true, true, true]);
  });

  /** `row` is a destination row: the flip happens on the source side, in `PixelLocator`. */
  it('still reassembles when the rows are read bottom-up', () => {
    const source = rowNumberedRgba8888(3, 7);
    const flipped = rgba8888({ flipY: true });

    expect(concatenated([...decoder.decodeSegments(source, flipped, undefined, 3)]))
      .toEqual([...decoder.decode(source, flipped).image.data]);
  });

  /**
   * The cases above are all shorter than one default band, so `decode` assembles them from a
   * single segment and could not misplace one. This is the only case that makes `decodeSource`
   * write at a second offset at all, with a row-at-a-time decode as the independent reference.
   */
  it('places every band when the image spans more than one default band', () => {
    const height = DEFAULT_ROWS_PER_SEGMENT + 36;
    const source = rowNumberedRgba8888(3, height);
    const tall = rgba8888({ height });

    expect([...decoder.decode(source, tall).image.data])
      .toEqual(concatenated([...decoder.decodeSegments(source, tall, undefined, 1)]));
  });

  it('carries the alpha mode into the banded path too', () => {
    const source = rowNumberedRgba8888(3, 7);
    const ignoring = rgba8888({ alphaMode: AlphaMode.Ignore });
    const alphas = concatenated([...decoder.decodeSegments(source, ignoring, undefined, 3)])
      .filter((_, index) => index % 4 === 3);

    expect(alphas).toEqual(Array.from({ length: 21 }, () => 255));
  });
});
