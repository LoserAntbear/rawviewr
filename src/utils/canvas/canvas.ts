import type { Rect } from '@app-types/canvas';

function validateRect(rect: Rect): boolean {
  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error('Invalid rect dimensions');
  }

  return true;
}

export const CanvasUtils = {
  validateRect,
};