export async function withAbortSignalCheck<T>(
  signal: AbortSignal | undefined,
  callback: () => Promise<T>,
  onDiscard?: (value: T) => void,
): Promise<T> {
  signal?.throwIfAborted();

  const value = await callback();

  if (signal?.aborted) {
    onDiscard?.(value);

    signal.throwIfAborted();
  }

  return value;
}

export function withAbortSignalCheckSync<T>(
  signal: AbortSignal | undefined,
  callback: () => T,
  onDiscard?: (value: T) => void,
): T {
  signal?.throwIfAborted();

  const value = callback();

  if (signal?.aborted) {
    onDiscard?.(value);

    signal.throwIfAborted();
  }

  return value;
}

