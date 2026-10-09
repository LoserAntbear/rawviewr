import type { ToolbarState } from './types';

export enum ToolbarStateTransition {
  Synced = 'synced',
}

export const EMPTY_TOOLBAR_STATE: ToolbarState = {
  values: {},
  choices: {},
  availability: {},
  kind: ToolbarStateTransition.Synced,
};
