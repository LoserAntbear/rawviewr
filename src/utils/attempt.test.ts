import { describe, expect, it, vi } from 'vitest';

import { attempt, attemptAsync, attemptDetached } from './attempt';

describe('attempt', () => {
  it('returns what `run` returns, without consulting `recover`', () => {
    const recover = vi.fn();

    expect(attempt(() => 42, recover)).toBe(42);
    expect(recover).not.toHaveBeenCalled();
  });

  it('turns a throw into `recover`\'s value, handing it the error', () => {
    const failure = new Error('boom');

    expect(attempt(() => {
      throw failure;
    }, (error) => (error === failure ? 'recovered' : 'wrong error'))).toBe('recovered');
  });

  it('lets a throw from `recover` escape, since there is nothing left to fall back on', () => {
    expect(() => attempt(() => {
      throw new Error('first');
    }, () => {
      throw new Error('second');
    })).toThrow('second');
  });
});

describe('attemptAsync', () => {
  it('resolves to what `run` resolves to, without consulting `recover`', async () => {
    const recover = vi.fn();

    await expect(attemptAsync(async () => 42, recover)).resolves.toBe(42);
    expect(recover).not.toHaveBeenCalled();
  });

  it('turns a rejection into `recover`\'s value — the `await` inside the `try` is what catches it', async () => {
    const failure = new Error('boom');

    await expect(attemptAsync(() => Promise.reject(failure), (error) => (error === failure ? 'recovered' : 'wrong error')))
      .resolves.toBe('recovered');
  });

  it('catches a synchronous throw from `run` the same way', async () => {
    await expect(attemptAsync((): Promise<string> => {
      throw new Error('sync');
    }, () => 'recovered')).resolves.toBe('recovered');
  });

  it('rejects with `recover`\'s throw, since there is nothing left to fall back on', async () => {
    await expect(attemptAsync(() => Promise.reject(new Error('first')), () => {
      throw new Error('second');
    })).rejects.toThrow('second');
  });
});

describe('attemptDetached', () => {
  it('starts `run` before returning — detaching defers nothing', () => {
    const run = vi.fn(async () => undefined);

    attemptDetached(run, vi.fn());

    expect(run).toHaveBeenCalledOnce();
  });

  it('routes a rejection to `recover`', async () => {
    const failure = new Error('rejected');
    const recover = vi.fn();

    attemptDetached(() => Promise.reject(failure), recover);

    await vi.waitFor(() => expect(recover).toHaveBeenCalledWith(failure));
  });

  it('routes a synchronous throw to the same `recover`, and never throws itself', async () => {
    const failure = new Error('thrown');
    const recover = vi.fn();

    expect(() => attemptDetached(() => {
      throw failure;
    }, recover)).not.toThrow();

    await vi.waitFor(() => expect(recover).toHaveBeenCalledWith(failure));
  });

  it('leaves `recover` alone when the work succeeds', async () => {
    const recover = vi.fn();
    const settled = vi.fn();

    attemptDetached(async () => settled(), recover);

    await vi.waitFor(() => expect(settled).toHaveBeenCalled());
    expect(recover).not.toHaveBeenCalled();
  });
});
