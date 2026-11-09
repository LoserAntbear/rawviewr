export enum TimeoutState {
  Active,
  Cleared,
  Completed,
}

export class ControlledTimeout {
  public get isTimedOut(): boolean {
    return this._state === TimeoutState.Completed;
  }

  public get state(): TimeoutState {
    return this._state;
  }

  private readonly timer: ReturnType<typeof setTimeout>;

  private _state = TimeoutState.Active;

  constructor(timeoutMs: number, handler: () => void) {
    this.timer = setTimeout(() => {
      this._state = TimeoutState.Completed;

      handler();
    }, timeoutMs);
  }

  /**
   * Clearing a deadline that has already fired does not un-fire it.
   */
  public clear(): void {
    if (this._state === TimeoutState.Active) {
      clearTimeout(this.timer);

      this._state = TimeoutState.Cleared;
    }
  }

  public ifPending(handler: () => void): void {
    if (this._state === TimeoutState.Active) {
      this.clear();

      handler();
    }
  }
}
