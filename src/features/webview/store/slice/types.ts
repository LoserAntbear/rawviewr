import type { StoreSliceEvent } from './definitions';
import type { EventMap, TypedEventTarget } from '../TypedEventTarget';

export type NoSliceEvents = Record<never, never>;
export type StoreSliceChange<TState> = {
  prev: TState;
  next: TState;
};

export type StoreSliceEventMap<
  TName extends string,
  TState,
  TEvents extends EventMap = NoSliceEvents,
> = Record<`${TName}:${StoreSliceEvent.Change}`, StoreSliceChange<TState>> & {
  [K in keyof TEvents & string as `${TName}:${K}`]: TEvents[K];
};

export type StoreSliceBus<
  TName extends string,
  TState,
  TEvents extends EventMap = NoSliceEvents,
> = TypedEventTarget<StoreSliceEventMap<TName, TState, TEvents>>;
