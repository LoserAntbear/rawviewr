import { byKey, type Strategies } from '@utils/strategy';

import { ZOOM } from './definitions';
import type { ZoomDirection } from '@features/zoom';

const ZOOM_STEPS: Strategies<ZoomDirection, [current: number], number> = {
  reset: () => ZOOM.default,
  in: (current) => current * ZOOM.factor,
  out: (current) => current / ZOOM.factor,
};

export function resolveZoom(current: number, direction: ZoomDirection): number {
  const next = byKey(ZOOM_STEPS, direction, current);

  return Math.min(ZOOM.max, Math.max(ZOOM.min, next));
}
