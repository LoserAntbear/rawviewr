import { resolveNotes } from './notes';
import { resolveSummary } from './summary';
import { resolveZoom } from './zoom';

export const SEGMENT_RESOLVERS = {
  zoom: resolveZoom,
  notes: resolveNotes,
  summary: resolveSummary,
};
