/**
 * The idea is to provide a state handler for custom components
 * there to decouple from the component itself.
 */
type ViewState<TKind> = {
  readonly kind: TKind;
};
type StateHandler<TState, TPayload> = (prevState: TState, payload: TPayload) => TState;
type StateHandlersMap<TState, TPayloads> = {
  readonly [K in keyof TPayloads]: StateHandler<TState, TPayloads[K]>;
};

export type ReadonlyViewState<TState = unknown> = {
  readonly state: TState;
};

export class RIVViewState<
  TStateKinds,
  TState extends ViewState<TStateKinds>,
  TPayloads,
> {
  public get state(): TState {
    return this._state;
  }

  private _state: TState;

  constructor(
    private initialState: TState,
    private handlers: StateHandlersMap<TState, TPayloads>,
  ) {
    this._state = this.initialState;
  }

  public updateState<K extends keyof TPayloads>(transition: K, payload: TPayloads[K]): TState {
    this._state = this.handlers[transition](this._state, payload);

    return this._state;
  }

  public reset(): TState {
    this._state = this.initialState;

    return this._state;
  }
}
