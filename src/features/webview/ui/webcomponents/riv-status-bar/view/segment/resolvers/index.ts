import { resolveNotes } from './notes';
import { resolveSummary } from './summary';

export const SEGMENT_RESOLVERS = {
  notes: resolveNotes,
  summary: resolveSummary,
};
