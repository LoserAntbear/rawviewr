import { describe, expect, it } from 'vitest';

import { resolveWheelZoomDirection } from './utils';

/**
 * The direction is read straight off the sign, whatever the device reported. A trackpad's
 * single pixel means in or out just as plainly as a mouse notch's hundred does — the
 * difference between the two is a matter of rate, which a throttle handles.
 */

describe('resolveWheelZoomDirection', () => {
  it.each([-100, -3, -0.5])('away from the user magnifies, at %f', (deltaY) => {
    expect(resolveWheelZoomDirection(deltaY)).toBe('in');
  });

  it.each([100, 3, 0.5])('towards the user shrinks, at %f', (deltaY) => {
    expect(resolveWheelZoomDirection(deltaY)).toBe('out');
  });

  it.each([0, -0, Number.NaN])('has nothing to say about %f', (deltaY) => {
    // A horizontal-only event — shift+wheel, or a sideways swipe — zooms nothing.
    expect(resolveWheelZoomDirection(deltaY)).toBeNull();
  });
});
