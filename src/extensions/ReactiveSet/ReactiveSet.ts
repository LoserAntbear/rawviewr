type InferActionResult<TAction, TResult> = TAction extends 'add' ? TResult : TAction extends 'delete' ? boolean : never;

type Listener<T> = (values: T[]) => void;

export class ReactiveSet<T> extends Set<T> {
  private readonly listeners: Set<Listener<T>> = new Set();

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
    let result = true;

    for (const v of values) {
      result = this.modifySingle(v, 'delete') as boolean;

      if (!result) {
        break;
      }
    }

    this.onChange();

    return result;
  }

  public clear(): void {
    super.clear();

    this.onChange();
  }

  public subscribe(listener: Listener<T>): void {
    this.listeners.add(listener);
  }

  public unsubscribe(listener: Listener<T>): void {
    this.listeners.delete(listener);
  }

  protected onChange(): void {
    for (const listener of this.listeners) {
      listener(Array.from(this));
    }
  }

  private modifySingle(
    value: T, action: 'add' | 'delete',
  ): InferActionResult<typeof action, this> {
    return super[action](value);
  }
}
