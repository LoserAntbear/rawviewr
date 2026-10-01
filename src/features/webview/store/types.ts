import type { EventMap, TypedEventTarget } from '../messaging/TypedEventTarget/TypedEventTarget';
import type { SourcesSlice } from './slice/SourcesSlice/SourcesSlice';
import type { ViewSlice } from './slice/ViewSlice';
import type { ImagesSlice } from './slice/ImagesSlice';
import type { DecodeOptionsSlice } from './slice/DecodeOptionsSlice';
import type { ReactiveStore } from './ReactiveStore';
import type { StoreSliceId } from './definitions';
import type { STORE_SELECTORS } from './selectors';
import { WebviewDisposable } from '../disposable';

type InferStoreSlicePayloads<TSlice> = TSlice extends { attach(bus: TypedEventTarget<infer TPayloads>): void }
  ? TPayloads
  : never;

export type SliceLike<TName extends string = string> = {
  readonly name: TName;

  reset(): void;
  getState(): unknown;
  attach(bus: TypedEventTarget<EventMap>): void;
};
export type SliceMap<TSliceIds extends string = string> = Readonly<Record<TSliceIds, SliceLike<TSliceIds>>>;
// TODO: Replace explicit StoreSlices mapping with a more generic approach, inferring from store creation
export type StoreSlices = {
  readonly [StoreSliceId.View]: ViewSlice;
  readonly [StoreSliceId.Images]: ImagesSlice;
  readonly [StoreSliceId.Sources]: SourcesSlice;
  readonly [StoreSliceId.DecodeOptions]: DecodeOptionsSlice;
};
export type StoreEventMap = UnionToIntersection<InferStoreSlicePayloads<StoreSlices[keyof StoreSlices]>>;

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
export type StoreReaction = (store: AppStore) => WebviewDisposable;

export type { EventMap };
