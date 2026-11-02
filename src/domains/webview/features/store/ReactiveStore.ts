import { listenTo } from '@SHARED/features/disposable/listenTo';
import type { WebviewDisposable } from '@SHARED/features/disposable/types';
import { WebviewDisposableStore } from '@SHARED/features/disposable/WebviewDisposableStore';
import type { TypedEventTarget } from '@SHARED/features/messaging/TypedEventTarget/TypedEventTarget';

import type {
  AppState,
  BoundSelectors,
  EventMap,
  Selector,
  SelectorMap,
  SliceLike,
  SliceMap,
  StateSubscriber,
} from './types';
import { isSameSelection } from './utils';

/**
 * TODO: Decouple state handling from the store.
 * Probably slices management as well.
 */
export class ReactiveStore<
  TSelectors extends SelectorMap<AppState<TSlices>>,
  TSlices extends SliceMap,
  TEvents extends EventMap,
  TSliceIds extends keyof TSlices & string = keyof TSlices & string,
  TBus extends TypedEventTarget<TEvents> = TypedEventTarget<TEvents>
> implements WebviewDisposable {
  public get state(): AppState<TSlices> {
    return this._currentState;
  }

  public readonly bus: TBus;
  public readonly selectors: BoundSelectors<AppState<TSlices>, TSelectors>;

  private readonly slices = new Map<TSliceIds, TSlices[TSliceIds]>();
  private readonly subscribers = new Set<StateSubscriber<AppState<TSlices>>>();
  private readonly listeners = new WebviewDisposableStore();

  private _currentState: AppState<TSlices>;

  constructor(
    slices: TSlices,
    bus: TBus,
    selectors: TSelectors = {} as TSelectors,
  ) {
    this.bus = bus;

    const entries = Object.entries(slices) as [TSliceIds, TSlices[TSliceIds]][];

    for (const [id, slice] of entries) {
      this.addSlice(id, slice);
    }

    this._currentState = this.readSlicesState();
    this.selectors = this.bindSelectors(selectors);
  }

  public register<K extends TSliceIds>(slice: TSlices[K] & SliceLike<K>): TSlices[K] {
    return this.addSlice(slice.name, slice) as TSlices[K];
  }

  public get<K extends TSliceIds>(id: K): TSlices[K] {
    const slice = this.slices.get(id);

    if (!slice) {
      throw new Error(`Slice "${id.toString()}" is not registered.`);
    }

    return slice as TSlices[K];
  }

  public has<K extends TSliceIds>(id: K): boolean {
    return this.slices.has(id);
  }

  /**
   * BEWARE:
   * If  you're using `store.get()` in selector, instead of reading passed state
   * One kitten dies.
   */
  public subscribe<TValue>(
    selector: Selector<AppState<TSlices>, TValue>,
    handler: (selected: TValue, previous: TValue | undefined) => void,
  ): WebviewDisposable {
    const stateSubscriber: StateSubscriber<AppState<TSlices>> = (previous, next) => {
      const previousSelection = selector(previous);
      const nextSelection = selector(next);

      if (!isSameSelection(previousSelection, nextSelection)) {
        handler(nextSelection, previousSelection);
      }
    };

    this.subscribers.add(stateSubscriber);

    handler(selector(this._currentState), undefined);

    return {
      dispose: () => {
        this.subscribers.delete(stateSubscriber);
      },
    };
  }

  public dispose(): void {
    this.subscribers.clear();
    this.listeners.dispose();
  }

  private readSlicesState(): AppState<TSlices> {
    return Object.fromEntries(
      Array.from(this.slices.entries(), ([id, slice]) => [id, slice.getState()]),
    ) as AppState<TSlices>;
  }

  private bindSelectors(selectors: TSelectors): BoundSelectors<AppState<TSlices>, TSelectors> {
    const bound = Object.entries(selectors as SelectorMap<AppState<TSlices>>).map(
      ([key, select]) => [key, (...args: never[]) => select(this.state, ...args)] as const,
    );

    return Object.fromEntries(bound) as BoundSelectors<AppState<TSlices>, TSelectors>;
  }

  private addSlice(id: TSliceIds, slice: TSlices[TSliceIds]): TSlices[TSliceIds] {
    if (this.slices.has(id)) {
      throw new Error(`Slice "${id.toString()}" is already registered.`);
    }

    this.slices.set(id, slice);

    slice.attach(this.bus);

    this.listeners.add(listenTo(this.bus, `${id}:change`, this.handleSliceChange.bind(this)));

    return slice;
  }

  private handleSliceChange(): void {
    const previous = this._currentState;
    const next = this.readSlicesState();

    this._currentState = next;

    for (const notify of this.subscribers) {
      notify(previous, next);
    }
  }
}
