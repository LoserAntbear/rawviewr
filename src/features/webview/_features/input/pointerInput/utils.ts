import type { Vector2 } from '@definitions/geometry';
import { VectorUtils } from '@utils/vector/vector';
import { CanvasUtils } from '@utils/canvas';

type ProbeRect = Vector2 & { readonly width: number; readonly height: number };
type ProbeSize = { readonly width: number; readonly height: number };
type ProbePointer = Vector2;

export function resolveEffectiveZoom(element: Element): number {
  const zoom = Number.parseFloat(element.computedStyleMap?.().get('zoom')?.toString() ?? '1');

  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

export function resolveProbePosition(
  pointer: ProbePointer,
  rect: ProbeRect,
  size: ProbeSize,
  scale: number = 1,
): Vector2 {
  CanvasUtils.validateRect(rect);

  const effectivePointer = VectorUtils.subtract(
    VectorUtils.divide(pointer, scale),
    rect,
  );

  return VectorUtils.floor(VectorUtils.clamp(
    {
      x: effectivePointer.x / rect.width * size.width,
      y: effectivePointer.y / rect.height * size.height,
    },
    { x: 0, y: 0 },
    // The far edge belongs to the last pixel, not to the one past it.
    { x: size.width - 1, y: size.height - 1 },
  ));
}
