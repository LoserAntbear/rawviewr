import { MAX_FILE_DIMENSION_PX } from '@SHARED/features/image/imageDecoder/definitions';
import type { Dimension } from '@SHARED/features/image/imageDecoder/imagePreparation/types';

export function isValidDimension(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_FILE_DIMENSION_PX;
}

export function areValidDimensions({ width, height }: Dimension): boolean {
  return isValidDimension(width) && isValidDimension(height);
}
