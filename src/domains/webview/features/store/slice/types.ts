import type { TypedEventTarget } from '@SHARED/features/messaging/TypedEventTarget/TypedEventTarget';

import type { StoreSliceEvent } from './SliceEvents/definitions';
import type { StoreSliceEventPayloads } from './SliceEvents/types';

/**
 * Slices automaticaly generate event keys based on their name and event names.
 * Event Names for stores are defined in the respective [StoreSliceEvent](./StoreSliceEvent) enum
 *
 * E.g. UserSlice:
 * SliceName = User,
 * EventName = StoreSliceEvent.Change -> ["change"]
 *
 * Resulting Event Key = "User:change"
 */
export type StoreSliceEventKey<TName extends string, TEventNames extends StoreSliceEvent> = `${TName}:${TEventNames}`;
export type StoreSliceBus<
  TName extends string,
  TState,
  TSliceEventMap extends StoreSliceEventPayloads<TName, TState> = StoreSliceEventPayloads<TName, TState>,
> = TypedEventTarget<TSliceEventMap>;
