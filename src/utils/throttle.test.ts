import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { throttle } from './throttle';

/**
 * Leading edge is what makes this usable for input: the first call answers at once, so a
 * single mouse notch is never swallowed waiting for a window to close.
 */

type Action = (...args: unknown[]) => void;

let action: Mock<Action>;

beforeEach(() => {
  vi.useFakeTimers();
  action = vi.fn<Action>();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('throttle', () => {
  it('lets the first call straight through', () => {
    throttle(action, 100)();

    expect(action).toHaveBeenCalledOnce();
  });

  it('drops the calls inside the window', () => {
    const throttled = throttle(action, 100);

    throttled();
    vi.advanceTimersByTime(99);
    throttled();

    expect(action).toHaveBeenCalledOnce();
  });

  it('opens again once the window has passed', () => {
    const throttled = throttle(action, 100);

    throttled();
    vi.advanceTimersByTime(100);
    throttled();

    expect(action).toHaveBeenCalledTimes(2);
  });

  it('never replays what it dropped', () => {
    const throttled = throttle(action, 100);

    throttled();
    throttled();
    throttled();
    vi.advanceTimersByTime(10_000);

    // No trailing call: a dropped step is gone, not deferred.
    expect(action).toHaveBeenCalledOnce();
  });

  it('passes the arguments of the call that got through', () => {
    const throttled = throttle(action, 100);

    throttled('in', 2);
    throttled('out', 3);

    expect(action).toHaveBeenCalledExactlyOnceWith('in', 2);
  });

  it('counts each throttled function on its own clock', () => {
    const other = vi.fn<Action>();

    throttle(action, 100)();
    throttle(other, 100)();

    expect(action).toHaveBeenCalledOnce();
    expect(other).toHaveBeenCalledOnce();
  });

  it('lets everything through at a zero interval, rather than nothing', () => {
    const throttled = throttle(action, 0);

    throttled();
    throttled();

    expect(action).toHaveBeenCalledTimes(2);
  });
});
