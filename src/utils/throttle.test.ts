import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { throttle, withThrottle } from './throttle';

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

/**
 * A decorator replaces the method on the prototype, so one function serves every instance.
 * What must not be shared is the window — these pin that, because sharing it would mean one
 * view's gesture silencing another's, and nothing in the types would say so.
 */
describe('withThrottle', () => {
  class View {
    public readonly seen: string[] = [];

    constructor(private readonly name = 'view') {}

    @withThrottle(100)
    public zoom(direction: string): void {
      // Pushed through `this`, so a mis-bound method shows up here as a crash.
      this.seen.push(`${this.name}:${direction}`);
    }
  }

  it('lets the first call through and drops the rest of the burst', () => {
    const view = new View();

    view.zoom('in');
    view.zoom('in');
    view.zoom('in');

    expect(view.seen).toEqual(['view:in']);
  });

  it('keeps a window per instance, so one view cannot silence another', () => {
    const first = new View('first');
    const second = new View('second');

    first.zoom('in');
    second.zoom('out');

    expect([first.seen, second.seen]).toEqual([['first:in'], ['second:out']]);
  });

  it('opens the window again once the interval has passed', () => {
    const view = new View();

    view.zoom('in');
    vi.advanceTimersByTime(100);
    view.zoom('out');

    expect(view.seen).toEqual(['view:in', 'view:out']);
  });

  it('shares one function across instances, as a prototype method does', () => {
    expect(new View().zoom).toBe(new View().zoom);
  });

  it('gives nothing back: a dropped call has no value to return', () => {
    expect(new View().zoom('in')).toBeUndefined();
  });
});
