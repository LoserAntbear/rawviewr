import { SEGMENT_RESOLVERS } from './resolvers';
import { SlotLifecycleMode } from './definitions';
import type { StatusSegment, StatusSegmentAlignment } from './types';

export type StatusSegmentsMap = ReadonlyMap<StatusSegmentAlignment, StatusSegment[]>;
// BEWARE: Order sensitive!
export const STATUS_SEGMENTS: StatusSegmentsMap = new Map<
  StatusSegmentAlignment,
  StatusSegment[]
>([
  ['start', [{ id: 'summary', resolve: SEGMENT_RESOLVERS.summary }]],
  ['end', [
    { id: 'probe', resolve: SEGMENT_RESOLVERS.probe },
    { id: 'zoom', resolve: SEGMENT_RESOLVERS.zoom },
    { id: 'notes', mode: SlotLifecycleMode.LiveUpdate, indicator: true, resolve: SEGMENT_RESOLVERS.notes },
  ]],
]);
