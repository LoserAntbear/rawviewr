import { TypedEventTarget } from './TypedEventTarget';
import type {
  AppState,
  BoundSelectors,
  EventMap,
  SelectorMap,
  SliceLike,
  SliceMap,
} from './types';

export class ReactiveStore<
  TSelectors extends SelectorMap<AppState<TSlices>>,
  TSlices extends SliceMap,
  TEvents extends EventMap,
  TSliceIds extends keyof TSlices & string = keyof TSlices & string
> {
  // CAVEAT: Every time returns a new ref
  public get state(): AppState<TSlices> {
    return Object.fromEntries(
      Array.from(this.slices.entries(), ([id, slice]) => [id, slice.getState()]),
    ) as AppState<TSlices>;
  }

  public readonly bus: TypedEventTarget<TEvents>;
  public readonly selectors: BoundSelectors<AppState<TSlices>, TSelectors>;

  private readonly slices = new Map<TSliceIds, TSlices[TSliceIds]>();

  constructor(
    slices: TSlices,
    bus: TypedEventTarget<TEvents>,
    selectors: TSelectors = {} as TSelectors,
  ) {
    this.bus = bus;

    const entries = Object.entries(slices) as [TSliceIds, TSlices[TSliceIds]][];

    for (const [id, slice] of entries) {
      this.add(id, slice);
    }

    this.selectors = this.bindSelectors(selectors);
  }

  public register<K extends TSliceIds>(slice: TSlices[K] & SliceLike<K>): TSlices[K] {
    this.add(slice.name, slice);

    return slice;
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

  private bindSelectors(selectors: TSelectors): BoundSelectors<AppState<TSlices>, TSelectors> {
    const bound = Object.entries(selectors as SelectorMap<AppState<TSlices>>).map(
      ([key, select]) => [key, (...args: never[]) => select(this.state, ...args)] as const,
    );

    return Object.fromEntries(bound) as BoundSelectors<AppState<TSlices>, TSelectors>;
  }

  private add(id: TSliceIds, slice: TSlices[TSliceIds]): void {
    if (this.slices.has(id)) {
      throw new Error(`Slice "${id.toString()}" is already registered.`);
    }

    this.slices.set(id, slice);

    slice.attach(this.bus);
  }
}
