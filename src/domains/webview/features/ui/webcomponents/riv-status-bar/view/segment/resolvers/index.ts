import { resolveNotes } from './notes';
import { resolvePinnedProbe, resolveProbe } from './probe';
import { resolveSummary } from './summary';
import { resolveZoom } from './zoom';

export const SEGMENT_RESOLVERS = {
  zoom: resolveZoom,
  probe: resolveProbe,
  notes: resolveNotes,
  pin: resolvePinnedProbe,
  summary: resolveSummary,
};
