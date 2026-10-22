export function withDebounce(delayMs: number) {
  return function debouncedMethod<TThis extends object, TArgs extends unknown[]>(
    method: (this: TThis, ...args: TArgs) => void,
  ): (this: TThis, ...args: TArgs) => void {
    const pending = new WeakMap<TThis, ReturnType<typeof setTimeout>>();

    return function (this: TThis, ...args: TArgs): void {
      const scheduled = pending.get(this);

      if (scheduled !== undefined) {
        clearTimeout(scheduled);
      }

      pending.set(this, setTimeout(() => {
        pending.delete(this);
        method.apply(this, args);
      }, delayMs));
    };
  };
}
