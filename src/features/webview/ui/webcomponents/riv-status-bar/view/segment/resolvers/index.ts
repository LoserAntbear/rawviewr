import { resolveNotes } from './notes';
import { resolveProbe } from './probe';
import { resolveSummary } from './summary';
import { resolveZoom } from './zoom';

export const SEGMENT_RESOLVERS = {
  zoom: resolveZoom,
  probe: resolveProbe,
  notes: resolveNotes,
  summary: resolveSummary,
};
