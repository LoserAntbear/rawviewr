import type {
  StoreSliceBus,
  StoreSliceEventKey,
} from './types';
import { StoreSliceEvent } from './SliceEvents/definitions';
import { StoreSliceEventPayloads } from './SliceEvents/types';

type EventNames = StoreSliceEvent;

export abstract class StoreSlice<
  TName extends string,
  TState,
  TPayloads extends StoreSliceEventPayloads<TName, TState> = StoreSliceEventPayloads<TName, TState>,
  TBus extends StoreSliceBus<TName, TState, TPayloads> = StoreSliceBus<TName, TState, TPayloads>,
> {
  private get bus(): TBus | undefined {
    if (!this._bus) {
      console.error(new Error(`Event bus is not attached to slice "${this.name}"`));
    }

    return this._bus;
  }

  private state: TState;
  private _bus?: TBus;

  constructor(
    public readonly name: TName,
    private readonly initialState: TState,
    bus?: TBus,
  ) {
    this.state = initialState;
    this._bus = bus as TBus | undefined;
  }

  public attach(bus: TBus): void {
    this._bus = bus;
  }

  public getState(): TState {
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

    this.emit(
      StoreSliceEvent.Change as EventNames,
      // @ts-expect-error TypeScript may not be able to infer the exact payload type here.
      { prev, next } as TPayloads[StoreSliceEventKey<TName, StoreSliceEvent.Change>],
    );
  }

  protected patch(partial: Partial<TState>): void {
    const changed = Object.entries(partial).some(
      ([key, value]) => !Object.is(this.state[key as keyof TState], value),
    );

    if (!changed) {
      return;
    }

    this.set({ ...this.state, ...partial });
  }

  // Strongly typed wrapper around `dispatch`, thus dispatch is private.
  protected emit<
    K extends EventNames,
  >(
    type: K,
    // @ts-expect-error TypeScript may not be able to infer the exact payload type here.
    payload: TPayloads[StoreSliceEventKey<TName, K>],
  ): void {
    const eventName = `${this.name}:${type}` as StoreSliceEventKey<TName, K>;

    // @ts-expect-error TypeScript may not be able to infer the exact payload type here.
    this.bus?.emit(eventName, payload);
  }
}
