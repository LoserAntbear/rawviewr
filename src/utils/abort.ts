export async function withAbortSignalCheck<T>(
  signal: AbortSignal | undefined,
  produce: () => Promise<T>,
  onDiscard?: (value: T) => void,
): Promise<T> {
  signal?.throwIfAborted();

  const value = await produce();

  if (signal?.aborted) {
    onDiscard?.(value);

    signal.throwIfAborted();
  }

  return value;
}
