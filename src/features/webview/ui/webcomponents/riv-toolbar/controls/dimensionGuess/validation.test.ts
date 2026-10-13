import { describe, expect, it } from 'vitest';
import { MAX_FILE_DIMENSION_PX } from '@features/image/imageDecoder/definitions';

import { areValidDimensions, isValidDimension } from './validation';

/**
 * The bound is the decoder's, not this control's: past it the geometry is clamped, so a
 * picker that offered more would be proposing a size nobody would get.
 */

describe('isValidDimension', () => {
  it.each([1, 640, MAX_FILE_DIMENSION_PX])('takes %i', (value) => {
    expect(isValidDimension(value)).toBe(true);
  });

  it.each([
    ['zero, which means open rather than chosen', 0],
    ['a negative', -4],
    ['a fraction', 4.5],
    ['past what the decoder would keep', MAX_FILE_DIMENSION_PX + 1],
    ['nothing at all', Number.NaN],
    ['an infinity', Number.POSITIVE_INFINITY],
  ])('refuses %s', (_label, value) => {
    expect(isValidDimension(value)).toBe(false);
  });
});

describe('areValidDimensions', () => {
  it('takes a pair that is good on both counts', () => {
    expect(areValidDimensions({ width: 640, height: 480 })).toBe(true);
  });

  it.each([
    ['the width', { width: 0, height: 480 }],
    ['the height', { width: 640, height: 0 }],
  ])('refuses a pair open on %s, since the decoder still decides it', (_label, dimension) => {
    expect(areValidDimensions(dimension)).toBe(false);
  });
});
