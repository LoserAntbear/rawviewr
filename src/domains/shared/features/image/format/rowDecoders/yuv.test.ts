import { describe, expect, it } from 'vitest';

import { writeYuvPixel } from './yuv';

/**
 * The conversion is checked against the BT.601 studio-swing reference values rather than
 * against itself: get a coefficient or the 16/128 offsets wrong and a picture comes out
 * plausibly tinted, which is the kind of wrong nobody notices in a screenshot.
 */
const convert = (y: number, u: number, v: number): number[] => {
  const row = new Uint8ClampedArray(4);

  writeYuvPixel(row, 0, y, u, v);

  return [...row];
};

describe('writeYuvPixel', () => {
  it.each([
    ['black', 16, 128, 128, [0, 0, 0]],
    ['white', 235, 128, 128, [255, 255, 255]],
    ['mid grey', 126, 128, 128, [128, 128, 128]],
  ])('turns %s into its RGB', (_label, y, u, v, expected) => {
    expect(convert(y, u, v).slice(0, 3)).toEqual(expected);
  });

  /** The primaries, at their BT.601 studio-swing encodings. */
  it.each([
    ['red', 81, 90, 240, [255, 0, 0]],
    ['green', 145, 54, 34, [0, 255, 0]],
    ['blue', 41, 240, 110, [0, 0, 255]],
  ])('turns %s into its RGB', (_label, y, u, v, expected) => {
    const rgb = convert(y, u, v).slice(0, 3);

    // Within a step: the integer coefficients are an approximation of the real matrix.
    rgb.forEach((channel, index) => expect(Math.abs(channel - expected[index]!)).toBeLessThanOrEqual(2));
  });

  it('leaves every pixel opaque, since 4:2:2 carries no alpha', () => {
    expect(convert(126, 128, 128)[3]).toBe(255);
  });

  /**
   * Studio swing puts legal luma in 16..235, but a raw dump can hold anything. The clamping is
   * the row's, not this function's — out-of-gamut maths relies on `Uint8ClampedArray`.
   */
  it.each([
    ['below black', 0, 128, 128, 0],
    ['above white', 255, 128, 128, 255],
  ])('clamps %s rather than wrapping', (_label, y, u, v, expected) => {
    expect(convert(y, u, v)[0]).toBe(expected);
  });

  it('writes only the pixel it was given, at the offset it was given', () => {
    const row = new Uint8ClampedArray(12);

    writeYuvPixel(row, 4, 235, 128, 128);

    expect([...row]).toEqual([0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0]);
  });
});
