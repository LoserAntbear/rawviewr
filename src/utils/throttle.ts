export function throttle<
  TArgs extends unknown[],
  Return = void,
>(
  action: (...args: TArgs) => Return,
  intervalMs: number,
): (...args: TArgs) => Return{
  let lastCall: number = Number.NEGATIVE_INFINITY;

  // @ts-expect-error: Throttle may return undefined if called too soon
  return (...args: TArgs) => {
    const now = Date.now();

    if (now - lastCall >= intervalMs) {
      lastCall = now;

      return action(...args);
    }
  };
}

export function withThrottle(intervalMs: number) {
  return function throttleMethod<This extends object, TArgs extends unknown[], Return>(
    method: (this: This, ...args: TArgs) => Return,
  ): (this: This, ...args: TArgs) => Return {
    /**
     * Have to keep the registry of throttled functions per instance.
     * Since otherwise each time a new instance calls the method, a new throttled function would be created, defeating the purpose of throttling.
     */
    const windows = new WeakMap<This, (...args: TArgs) => Return>();

    return function (this: This, ...args: TArgs): Return {
      const throttled = windows.get(this) ?? throttle(method.bind(this), intervalMs);

      windows.set(this, throttled);

      return throttled(...args);
    };
  };
}
