import { Vector2 } from '@definitions/geometry';
import { clamp as clampNumber } from '@utils/math';

function divide(vector: Vector2, divisor: number): Vector2 {
  return {
    x: vector.x / divisor,
    y: vector.y / divisor,
  };
}

function clamp(value: Vector2, min: Vector2, max: Vector2): Vector2 {
  return {
    x: clampNumber(value.x, min.x, max.x),
    y: clampNumber(value.y, min.y, max.y),
  };
}

export const VectorUtils = {
  clamp,
  divide,
};
