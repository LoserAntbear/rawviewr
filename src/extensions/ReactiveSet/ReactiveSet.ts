import type { ReactiveSetListener } from './types';

type InferActionResult<TAction, TResult> = TAction extends 'add' ? TResult : TAction extends 'delete' ? boolean : never;

enum ReactiveSetState {
  Blocked = 'blocked',
  Free = 'free',
}
export class ReactiveSet<T> extends Set<T> {
  private get allowsPostChanges(): boolean {
    return this.state === ReactiveSetState.Free;
  }

  private readonly listeners: Set<ReactiveSetListener<T>> = new Set();

  private state: ReactiveSetState = ReactiveSetState.Free;

  public add(value: T): this;
  public add(value: T[]): this;
  public add(value: T | T[]): this {
    const values = Array.isArray(value) ? value : [value];

    for (const v of values) {
      this.modifySingle(v, 'add');
    }

    this.onChange();

    return this;
  }

  public delete(value: T): boolean;
  public delete(value: T[]): boolean;
  public delete(value: T | T[]): boolean {
    const values = Array.isArray(value) ? value : [value];
    let result = false;

    for (const v of values) {
      result = (this.modifySingle(v, 'delete') as boolean) || result;
    }

    this.onChange();

    return result;
  }

  public clear(): void {
    super.clear();

    this.onChange();
  }

  public refine(addValues: T[], deleteValues: T[] = []): void {
    this.batch(() => {
      this.add(addValues);
      this.delete(deleteValues);
    });

    this.onChange();
  }

  public subscribe(listener: ReactiveSetListener<T>): void {
    this.listeners.add(listener);
  }

  public unsubscribe(listener: ReactiveSetListener<T>): void {
    this.listeners.delete(listener);
  }

  protected onChange(): void {
    if (!this.allowsPostChanges) {
      for (const listener of this.listeners) {
        listener(Array.from(this));
      }
    }
  }

  private modifySingle(
    value: T, action: 'add' | 'delete',
  ): InferActionResult<typeof action, this> {
    return super[action](value);
  }

  private batch<T>(callback: () => T): T {
    const previousState = this.state;

    this.state = ReactiveSetState.Blocked;

    try {
      return callback();
    } finally {
      this.state = previousState;
    }
  }
}
