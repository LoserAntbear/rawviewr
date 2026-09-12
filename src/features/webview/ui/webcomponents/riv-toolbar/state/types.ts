import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { ToolbarControlStatus } from '../types';
import { DecodeOptions } from '@features/image/imageDecoder/types';
import type { ToolbarStateTransition } from './definitions';

export type ToolbarAvailability = Readonly<Record<string, ToolbarControlStatus>>;
export type ToolbarTransitionPayloads = {
  [ToolbarStateTransition.Synced]: { options: DecodeOptions; formatRegistry: FormatRegistry };
};

export type ToolbarState = {
  readonly kind: ToolbarStateTransition;
  readonly availability: ToolbarAvailability;
  readonly values: Readonly<Record<string, string>>;
};

export type ToolbarStateHandlers = {
  readonly [K in ToolbarStateTransition]: (
    prev: ToolbarState,
    payload: ToolbarTransitionPayloads[K],
  ) => ToolbarState;
};
