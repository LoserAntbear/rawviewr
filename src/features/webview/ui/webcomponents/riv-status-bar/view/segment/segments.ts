import { SEGMENT_RESOLVERS } from './resolvers';
import { SlotLifecycleMode } from './definitions';
import type { StatusSegment, StatusSegmentAlignment } from './types';

export type StatusSegmentsMap = ReadonlyMap<StatusSegmentAlignment, StatusSegment[]>;
export const STATUS_SEGMENTS: StatusSegmentsMap = new Map<
  StatusSegmentAlignment,
  StatusSegment[]
>([
  ['start', [{ id: 'summary', resolve: SEGMENT_RESOLVERS.summary }]],
  ['end', [{ id: 'notes', mode: SlotLifecycleMode.LiveUpdate, telltale: true, resolve: SEGMENT_RESOLVERS.notes }]],
]);
