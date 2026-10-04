  import type { Vector2 } from '@definitions/geometry';
import { VectorUtils } from '@utils/vector/vector';
import { CanvasUtils } from '@utils/canvas';

type ProbeRect = Vector2 & { readonly width: number; readonly height: number };
type ProbePointer = Vector2;

export function resolveProbePosition(
  pointer: ProbePointer,
  rect: ProbeRect,
  scale: number = 1,
): Vector2 {
  CanvasUtils.validateRect(rect);

  const effectivePointer = VectorUtils.subtract(
    VectorUtils.divide(pointer, scale),
    rect,
  );

  return VectorUtils.floor(VectorUtils.clamp(
    effectivePointer,
    { x: 0, y: 0 },
    { x: rect.width, y: rect.height },
  ));
}
