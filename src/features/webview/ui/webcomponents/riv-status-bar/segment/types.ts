import type { StatusContext } from '../state/types';
import type { StatusText } from '../state/types';

export type StatusSegmentAlignment = 'start' | 'end';
export type StatusMode = 'announce';

export type StatusSegment = {
  readonly id: string;

  readonly mode?: StatusMode;
  /** `null` hides the segment. */
  readonly resolve: (context: StatusContext) => StatusText | null;
};
