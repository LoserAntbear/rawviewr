import type { SourceLocation } from '@features/image/sourceReader/types';

import type { PinnedProbeSample, ProbeSample } from './types';

export function isSamePixel(current: ProbeSample | null, next: ProbeSample): boolean {
  return current !== null
    && current.id === next.id
    && current.position.x === next.position.x
    && current.position.y === next.position.y;
}

export function isSameSample(
  pinned: PinnedProbeSample | null,
  id: string,
  location: SourceLocation,
): boolean {
  return pinned !== null
    && pinned.id === id
    && pinned.location.byteOffset === location.byteOffset
    && pinned.location.bitOffset === location.bitOffset;
}
