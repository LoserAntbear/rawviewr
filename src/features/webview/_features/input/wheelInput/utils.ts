import type { ZoomDirection } from '@features/zoom';

type WheelDirectionKey = '-1' | '0' | '1';

const WHEEL_DIRECTIONS: Readonly<Record<WheelDirectionKey, ZoomDirection | null>> = {
  '-1': 'in',
  '0': null,
  '1': 'out',
};

function toDirectionKey(deltaY: number): WheelDirectionKey {
  return Math.sign(deltaY).toString() as WheelDirectionKey;
}

export function resolveWheelZoomDirection(deltaY: number): ZoomDirection | null {
  return WHEEL_DIRECTIONS[toDirectionKey(deltaY)] ?? null;
}
