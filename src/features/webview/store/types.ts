import type { EventMap, TypedEventTarget } from './TypedEventTarget';
import type { StoreSliceChange } from './slice/types';
import type { SourcesSlice, SourcesSliceEvents } from './slice/SourcesSlice/SourcesSlice';
import type { ViewSlice, ViewSliceEvents } from './slice/ViewSlice';
import type { ImagesSlice, ImagesSliceEvents } from './slice/ImagesSlice';
import type { DecodeOptionsSliceEvents } from './slice/DecodeOptionsSlice/types';
import type { ReactiveStore } from './ReactiveStore';
import type { StoreSliceId } from './definitions';
import type { STORE_SELECTORS } from './selectors';
import { WebviewDisposable } from '../disposable';

export type SliceLike<TName extends string = string> = {
  readonly name: TName;

  reset(): void;
  getState(): unknown;
  attach(bus: TypedEventTarget<EventMap>): void;
};
export type SliceMap<TSliceIds extends string = string> = Readonly<Record<TSliceIds, SliceLike<TSliceIds>>>;
export type StoreSlices = {
  readonly [StoreSliceId.View]: ViewSlice;
  readonly [StoreSliceId.Sources]: SourcesSlice;
  readonly [StoreSliceId.Images]: ImagesSlice;
};
export type StoreEventMap = SourcesSliceEvents & ViewSliceEvents & ImagesSliceEvents & DecodeOptionsSliceEvents;

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
  readonly [K in keyof TSlices]: ReturnType<TSlices[K]['getState']>;
};
export type AppStore = ReactiveStore<typeof STORE_SELECTORS, StoreSlices, StoreEventMap>;
export type AppStoreState = AppState<StoreSlices>;
export type AppBus = TypedEventTarget<StoreEventMap>;

export type StoreChangeEvent<TState> = CustomEvent<StoreSliceChange<TState>>;

export type StoreReaction = (store: AppStore) => WebviewDisposable;

export type { EventMap };
