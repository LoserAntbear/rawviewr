import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ControlledTimeout, TimeoutState } from './ControlledTimeout';

/** Fake timers, so a deadline worth waiting for costs nothing to wait for. */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('a deadline left to run', () => {
  it('is pending until the time passes', () => {
    const deadline = new ControlledTimeout(1000, () => undefined);

    vi.advanceTimersByTime(999);

    expect(deadline.state).toBe(TimeoutState.Active);
  });

  it('runs its handler when the time passes, and says it completed', () => {
    const fired = vi.fn();
    const deadline = new ControlledTimeout(1000, fired);

    vi.advanceTimersByTime(1000);

    expect(fired).toHaveBeenCalledOnce();
    expect(deadline.state).toBe(TimeoutState.Completed);
  });
});

describe('a deadline that is cleared', () => {
  it('never runs its handler', () => {
    const fired = vi.fn();
    const deadline = new ControlledTimeout(1000, fired);

    deadline.clear();
    vi.advanceTimersByTime(10_000);

    expect(fired).not.toHaveBeenCalled();
    expect(deadline.state).toBe(TimeoutState.Cleared);
  });

  /**
   * The whole reason this is an object rather than a flag. The caller clears the deadline on its
   * way out of a run that has ended — including the run the deadline itself ended — and it then
   * asks which of those happened. A `clear` that overwrote `Completed` would answer "cleared" to
   * every timed-out run, and the timeout would be reported as an ordinary exit.
   */
  it('still says it completed when it is cleared after firing', () => {
    const deadline = new ControlledTimeout(1000, () => undefined);

    vi.advanceTimersByTime(1000);
    deadline.clear();

    expect(deadline.state).toBe(TimeoutState.Completed);
  });
});

describe('claiming a deadline that is still pending', () => {
  it('runs the handler and takes the deadline out of the race', () => {
    const fired = vi.fn();
    const claimed = vi.fn();
    const deadline = new ControlledTimeout(1000, fired);

    deadline.ifPending(claimed);
    vi.advanceTimersByTime(10_000);

    expect(claimed).toHaveBeenCalledOnce();
    expect(fired).not.toHaveBeenCalled();
    expect(deadline.state).toBe(TimeoutState.Cleared);
  });

  /** Having lost the race, the caller stands down: the deadline's handler has had its say. */
  it('does nothing once the deadline has fired', () => {
    const claimed = vi.fn();
    const deadline = new ControlledTimeout(1000, () => undefined);

    vi.advanceTimersByTime(1000);
    deadline.ifPending(claimed);

    expect(claimed).not.toHaveBeenCalled();
    expect(deadline.state).toBe(TimeoutState.Completed);
  });

  /** Two racers, one claim: whoever got there first has already acted on it. */
  it('does nothing the second time', () => {
    const claimed = vi.fn();
    const deadline = new ControlledTimeout(1000, () => undefined);

    deadline.ifPending(claimed);
    deadline.ifPending(claimed);

    expect(claimed).toHaveBeenCalledOnce();
  });
});
