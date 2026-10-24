import type { DecodeOptions } from '@SHARED/features/image/imageDecoder/types';
import type { ViewerBackground } from '@SHARED/features/viewer/definitions';

import type { ToolbarChoiceGroup, ToolbarControlStatus } from '../controls/types';

import type { ToolbarStateTransition } from './definitions';

export type ToolbarAvailability = Readonly<Record<string, ToolbarControlStatus>>;

export type ToolbarSyncPayload = {
  readonly zoom: number;
  readonly availableBytes: number;
  readonly options: DecodeOptions;
  readonly preserveOptions: boolean;
  readonly background: ViewerBackground;
};
export type ToolbarTransitionPayloads = {
  [ToolbarStateTransition.Synced]: ToolbarSyncPayload;
};

export type ToolbarState = {
  readonly kind: ToolbarStateTransition;
  readonly availability: ToolbarAvailability;
  readonly values: Readonly<Record<string, string>>;
  readonly choices: Readonly<Record<string, readonly ToolbarChoiceGroup[]>>;
};

export type ToolbarStateHandlers = {
  readonly [K in ToolbarStateTransition]: (
    prev: ToolbarState,
    payload: ToolbarTransitionPayloads[K],
  ) => ToolbarState;
};
