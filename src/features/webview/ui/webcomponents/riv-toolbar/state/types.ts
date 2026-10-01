import { ToolbarControlStatus } from '../controls/types';
import { DecodeOptions } from '@features/image/imageDecoder/types';
import type { ToolbarStateTransition } from './definitions';

export type ToolbarAvailability = Readonly<Record<string, ToolbarControlStatus>>;

export type ToolbarSyncPayload = {
  readonly zoom: number;
  readonly options: DecodeOptions;
};
export type ToolbarTransitionPayloads = {
  [ToolbarStateTransition.Synced]: ToolbarSyncPayload;
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
