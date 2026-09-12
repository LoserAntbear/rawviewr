import { ToolbarStateTransition } from './definitions';
import { resolveToolbarState } from './resolvers';
import type { ToolbarStateHandlers } from './types';

export const TOOLBAR_STATE_HANDLERS: ToolbarStateHandlers = {
  [ToolbarStateTransition.Synced]: (_prev, { options, formatRegistry }) => resolveToolbarState(
    options,
    formatRegistry,
  ),
};
