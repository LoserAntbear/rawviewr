/**
 * The set of utilities for safely attempting synchronous and asynchronous operations
 * With free error recovery in each bag!
 */

export function attempt<TResult>(
  run: () => TResult,
  recover: (error: unknown) => TResult,
): TResult {
  try {
    return run();
  } catch (error) {
    return recover(error);
  }
}

export async function attemptAsync<TResult>(
  run: () => Promise<TResult>,
  recover: (error: unknown) => TResult,
): Promise<TResult> {
  try {
    return await run();
  } catch (error) {
    return recover(error);
  }
}

/**
 * A wrapper for calls which are detached from the main execution flow
 * e.g.: callbacks, handlers, event listeners, etc. The things you usually pass as arguments to other functions.
 *
 * Also gives you awaiting and error handling for free, yey.
 */
export function attemptDetached(run: () => unknown, recover: (error: unknown) => void): void {
  new Promise((resolve) => resolve(run())).catch(recover);
}
