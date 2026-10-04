import type { ProbeSample } from './types';

export function isSamePixel(current: ProbeSample | null, next: ProbeSample): boolean {
  return current !== null
    && current.id === next.id
    && current.position.x === next.position.x
    && current.position.y === next.position.y;
}
