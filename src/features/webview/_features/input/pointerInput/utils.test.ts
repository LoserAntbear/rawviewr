import { describe, expect, it } from 'vitest';

import { resolveProbePosition } from './utils';

/**
 * The mapping divides the box by the pixels, so every scale the viewer can be at — 1:1,
 * zoomed, or fitted into a gallery tile — is the same arithmetic. Verified against real
 * layout in headless Chrome as well, since CSS `zoom` is what makes the box grow.
 */

const rect = (width: number, height: number = width, left = 0, top = 0) => ({ left, top, width, height });
const size = (width: number, height = width) => ({ width, height });

describe('resolveProbePosition', () => {
  it('maps one to one when the canvas sits at its intrinsic size', () => {
    expect(resolveProbePosition({ clientX: 3, clientY: 7 }, rect(16), size(16))).toEqual({ x: 3, y: 7 });
  });

  it('divides out a zoomed box: four screen pixels to the image pixel', () => {
    expect(resolveProbePosition({ clientX: 12, clientY: 28 }, rect(64), size(16))).toEqual({ x: 3, y: 7 });
  });

  it('divides out a fitted box, where the image is larger than its tile', () => {
    expect(resolveProbePosition({ clientX: 10, clientY: 10 }, rect(100), size(400))).toEqual({ x: 40, y: 40 });
  });

  it('counts from the box, not the viewport', () => {
    expect(resolveProbePosition({ clientX: 108, clientY: 54 }, rect(16, 16, 100, 50), size(16))).toEqual({ x: 8, y: 4 });
  });

  it('floors to the pixel the pointer is inside of', () => {
    expect(resolveProbePosition({ clientX: 7.9, clientY: 0.1 }, rect(8), size(8))).toEqual({ x: 7, y: 0 });
  });

  it('keeps the far edge on the last pixel rather than one past it', () => {
    // At exactly the right edge the ratio is 1, which would otherwise index out of bounds.
    expect(resolveProbePosition({ clientX: 16, clientY: 16 }, rect(16), size(16))).toEqual({ x: 15, y: 15 });
  });

  it('has nowhere to map onto before the canvas is laid out', () => {
    expect(resolveProbePosition({ clientX: 1, clientY: 1 }, rect(0), size(16))).toBeNull();
  });

  it('has nowhere to map onto while nothing is decoded', () => {
    expect(resolveProbePosition({ clientX: 1, clientY: 1 }, rect(16), size(0))).toBeNull();
  });
});
