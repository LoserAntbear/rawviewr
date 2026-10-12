import { describe, expect, it } from 'vitest';

import { DIMENSION_LABELS } from './labels';

/**
 * Every word the control shows comes from here, so this is the seam a catalogue would sit
 * behind. What is pinned is the shape each label takes, not the English in it.
 */

describe('DIMENSION_LABELS', () => {
  it('names leaving the size to the decoder', () => {
    expect(DIMENSION_LABELS.auto()).toBe('auto');
  });

  it('reads a size the way a reader expects, not the way it travels', () => {
    // `640x480` is the option's value; this is what sits beside it.
    expect(DIMENSION_LABELS.guess({ width: 640, height: 480 })).toBe('640 × 480');
  });

  it('marks a size that was typed rather than proposed', () => {
    expect(DIMENSION_LABELS.custom({ width: 5, height: 7 })).toBe('5 × 7 — yours');
  });

  it('builds every label from the same reading of a size', () => {
    const dimension = { width: 12, height: 34 };

    expect(DIMENSION_LABELS.custom(dimension)).toContain(DIMENSION_LABELS.guess(dimension));
  });
});
