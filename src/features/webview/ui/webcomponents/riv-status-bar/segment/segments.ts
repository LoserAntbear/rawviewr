import { resolveNotes } from './resolvers/notes';
import { resolveSummary } from './resolvers/summary';
import { SlotLifecycleMode } from './definitions';
import type { StatusSegment, StatusSegmentAlignment } from './types';

export const STATUS_SEGMENTS: ReadonlyMap<StatusSegmentAlignment, StatusSegment[]> = new Map<
  StatusSegmentAlignment,
  StatusSegment[]
>([
  ['start', [{ id: 'summary', resolve: resolveSummary }]],
  ['end', [{ id: 'notes', mode: SlotLifecycleMode.LiveUpdate, telltale: true, resolve: resolveNotes }]],
]);
