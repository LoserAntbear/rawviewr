import type { ZoomDirection } from '@features/zoom';

type WheelDirectionKey = '-1' | '0' | '1';

/**
 * Which way the wheel went, and nothing about how far: a mouse notch and a trackpad pinch
 * differ only in how much they report, never in which direction. How often a gesture may
 * step is a separate question, and a throttle's to answer.
 *
 * `0` is a horizontal-only event — shift+wheel, or a sideways swipe — which zooms nothing.
 */
const WHEEL_DIRECTIONS: Readonly<Record<WheelDirectionKey, ZoomDirection | null>> = {
  '-1': 'in',
  '0': null,
  '1': 'out',
};

function toDirectionKey(deltaY: number): WheelDirectionKey {
  return Math.sign(deltaY).toString() as WheelDirectionKey;
}

export function resolveWheelZoomDirection(deltaY: number): ZoomDirection | null {
  // `??` covers the one key `Math.sign` can name that the map cannot: NaN.
  return WHEEL_DIRECTIONS[toDirectionKey(deltaY)] ?? null;
}
