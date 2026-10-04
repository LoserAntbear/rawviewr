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

function floor(vector: Vector2): Vector2 {
  return {
    x: Math.floor(vector.x),
    y: Math.floor(vector.y),
  };
}

function add(vectorA: Vector2, vectorB: Vector2): Vector2 {
  return {
    x: vectorA.x + vectorB.x,
    y: vectorA.y + vectorB.y,
  };
}

function subtract(vectorA: Vector2, vectorB: Vector2): Vector2 {
  return {
    x: vectorA.x - vectorB.x,
    y: vectorA.y - vectorB.y,
  };
}

export const VectorUtils = {
  add,
  clamp,
  floor,
  divide,
  subtract,
};
