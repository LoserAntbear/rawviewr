import { TypedEventTarget, EventMap } from '../TypedEventTarget';
import type {
  NoSliceEvents,
  StoreSliceBus,
  StoreSliceChange,
} from './types';
import { StoreSliceEvent } from './definitions';

export abstract class StoreSlice<
  TName extends string,
  TState,
  TEvents extends EventMap = NoSliceEvents,
> {
  private get bus(): StoreSliceBus<TName, TState, TEvents> | undefined {
    if (!this._bus) {
      console.error(new Error(`Event bus is not attached to slice "${this.name}"`));
    }

    return this._bus;
  }

  private state: TState;
  private _bus?: StoreSliceBus<TName, TState, TEvents>;

  constructor(
    private readonly name: TName,
    private readonly initialState: TState,
    bus?: StoreSliceBus<TName, TState, TEvents>,
  ) {
    this.state = initialState;
    this._bus = bus;
  }

  public attach(bus: StoreSliceBus<TName, TState, TEvents>): void {
    this._bus = bus;
  }

  public get(): TState {
    return this.state;
  }

  public reset(): void {
    this.set(this.initialState);
  }

  protected set(next: TState): void {
    if (Object.is(this.state, next)) {
      return;
    }

    const prev = this.state;

    this.state = next;

    this.dispatch(StoreSliceEvent.Change, { prev, next } satisfies StoreSliceChange<TState>);
  }

  protected patch(partial: Partial<TState>): void {
    this.set({ ...this.state, ...partial });
  }

  protected emit<K extends keyof TEvents & string>(
    type: K,
    ...args: TEvents[K] extends void ? [] : [detail: TEvents[K]]
  ): void {
    this.dispatch(type, (args as [detail?: TEvents[K]])[0]);
  }

  /**
   * The single point where the runtime name prefix is applied.
   *
   * TypeScript cannot match `${TName}:${K}` against `StoreSliceEventMap`'s key remapping
   * while `TEvents` is still a type parameter, so the bus is widened to its untyped shape
   * here. Everything above is checked against `TEvents` / `StoreSliceChange<TState>`, and
   * subscribers still see the fully namespaced map.
   */
  private dispatch(type: string, detail: unknown): void {
    (this.bus as TypedEventTarget<EventMap> | undefined)?.emit(`${this.name}:${type}`, detail);
  }
}
