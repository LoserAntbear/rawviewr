import type { EventMap, TypedEventTarget } from './TypedEventTarget';
import type { StoreSliceChange } from './slice/types';
import type { ItemsSlice, ItemsSliceEvents } from './slice/ItemsSlice';
import type { ViewSlice, ViewSliceEvents } from './slice/ViewSlice';
import type { DecodeSlice, DecodeSliceEvents } from './slice/DecodeSlice';
import type { ReactiveStore } from './ReactiveStore';
import type { StoreSliceId } from './definitions';
import type { STORE_SELECTORS } from './selectors';

export type SliceLike<TName extends string = string> = {
  readonly name: TName;

  reset(): void;
  get(): unknown;
  attach(bus: TypedEventTarget<EventMap>): void;
};
export type SliceMap<TSliceIds extends string = string> = Readonly<Record<TSliceIds, SliceLike<TSliceIds>>>;
export type StoreSlices = {
  readonly [StoreSliceId.Items]: ItemsSlice;
  readonly [StoreSliceId.View]: ViewSlice;
  readonly [StoreSliceId.Decode]: DecodeSlice;
};
export type StoreEventMap = ItemsSliceEvents & ViewSliceEvents & DecodeSliceEvents;

export type Selector<TState, TResult, TArgs extends unknown[] = []> = (
  state: TState,
  ...args: TArgs
) => TResult;
export type SelectorMap<TState> = Readonly<Record<string, Selector<TState, unknown, never[]>>>;
export type BoundSelectors<TState, TSelectors extends SelectorMap<TState>> = {
  readonly [K in keyof TSelectors]: TSelectors[K] extends Selector<TState, infer TResult, infer TArgs>
    ? (...args: TArgs) => TResult
    : never;
};

export type AppState<TSlices extends SliceMap> = {
  readonly [K in keyof TSlices]: ReturnType<TSlices[K]['get']>;
};
export type AppStore = ReactiveStore<typeof STORE_SELECTORS, StoreSlices, StoreEventMap>;
export type AppStoreState = AppState<StoreSlices>;
export type AppBus = TypedEventTarget<StoreEventMap>;

export type StoreChangeEvent<TState> = CustomEvent<StoreSliceChange<TState>>;

export type { EventMap };
