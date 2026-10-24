import { describe, expect, it } from 'vitest';

import { resolveEffectiveZoom, resolveProbePosition } from './utils';

/**
 * Two scales between the pointer and the pixel: the zoom, passed in because the box comes
 * back without it in the webview, and the canvas's own fit, which is the ratio between the
 * box and the pixels it holds.
 *
 * The zoom convention is the engine's and has already differed between a standalone Chrome
 * 154 (box reported scaled) and VS Code 1.140's Chromium 150 (reported unscaled) — which is
 * why it is an argument here rather than something this function tries to work out.
 */

const rect = (width: number, height: number = width, x = 0, y = 0) => ({ x, y, width, height });
const size = (width: number, height = width) => ({ width, height });

describe('resolveProbePosition', () => {
  it('maps one to one when the canvas sits at its intrinsic size', () => {
    expect(resolveProbePosition({ x: 3, y: 7 }, rect(16), size(16))).toEqual({ x: 3, y: 7 });
  });

  it('divides the zoom out of the pointer, since the box is reported without it', () => {
    expect(resolveProbePosition({ x: 12, y: 28 }, rect(16), size(16), 4)).toEqual({ x: 3, y: 7 });
  });

  it('divides out a fitted box, where the image is larger than its tile', () => {
    expect(resolveProbePosition({ x: 10, y: 10 }, rect(100), size(400))).toEqual({ x: 40, y: 40 });
  });

  it('counts from the box, not the viewport', () => {
    expect(resolveProbePosition({ x: 108, y: 54 }, rect(16, 16, 100, 50), size(16))).toEqual({ x: 8, y: 4 });
  });

  it('counts from the box at a zoom too, where both are scaled together', () => {
    // A box reported unscaled sits at 100,50 in its own space; the pointer arrives scaled.
    expect(resolveProbePosition({ x: 432, y: 216 }, rect(16, 16, 100, 50), size(16), 4)).toEqual({ x: 8, y: 4 });
  });

  it('floors to the pixel the pointer is inside of', () => {
    expect(resolveProbePosition({ x: 7.9, y: 0.1 }, rect(8), size(8))).toEqual({ x: 7, y: 0 });
  });

  it('keeps the far edge on the last pixel rather than one past it', () => {
    // At exactly the right edge the ratio is 1, which would otherwise index out of bounds.
    expect(resolveProbePosition({ x: 16, y: 16 }, rect(16), size(16))).toEqual({ x: 15, y: 15 });
  });

  it('refuses a canvas that has not been laid out, rather than guessing a pixel', () => {
    expect(() => resolveProbePosition({ x: 1, y: 1 }, rect(0), size(16))).toThrow('Invalid rect dimensions');
  });
});

/**
 * The zoom is read through the Typed OM, which happy-dom does not have and other engines
 * need not. A missing or unreadable value means "not zoomed", never a NaN that would send
 * every reading out of bounds.
 */
describe('resolveEffectiveZoom', () => {
  const withZoom = (value: unknown): Element => ({
    computedStyleMap: () => ({ get: () => (value === undefined ? undefined : { toString: () => String(value) }) }),
  } as unknown as Element);

  it('reads the factor the element is painted at', () => {
    expect(resolveEffectiveZoom(withZoom(4))).toBe(4);
  });

  it('reads a fractional factor as well', () => {
    expect(resolveEffectiveZoom(withZoom(0.25))).toBe(0.25);
  });

  it('falls back to no zoom where the Typed OM is missing', () => {
    expect(resolveEffectiveZoom({} as Element)).toBe(1);
  });

  it.each([
    ['nothing to read', undefined],
    ['a keyword', 'normal'],
    ['zero', 0],
    ['a negative', -2],
  ])('falls back to no zoom on %s', (_label, value) => {
    expect(resolveEffectiveZoom(withZoom(value))).toBe(1);
  });
});
