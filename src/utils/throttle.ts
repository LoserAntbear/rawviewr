export function throttle<TArgs extends unknown[]>(
  action: (...args: TArgs) => void,
  intervalMs: number,
): (...args: TArgs) => void {
  let lastCall: number = Number.NEGATIVE_INFINITY;

  return (...args: TArgs) => {
    const now = Date.now();

    if (now - lastCall >= intervalMs) {
      lastCall = now;

      action(...args);
    }
  };
}
