import { describe, expect, it, vi } from 'vitest';

import { withAbortSignalCheck } from './abort';

describe('withAbortSignalCheck', () => {
  it('passes the value through when nothing aborts', async () => {
    const discard = vi.fn();

    await expect(withAbortSignalCheck(new AbortController().signal, async () => 'v', discard))
      .resolves.toBe('v');
    expect(discard).not.toHaveBeenCalled();
  });

  it('treats a missing signal as a pass-through', async () => {
    await expect(withAbortSignalCheck(undefined, async () => 42)).resolves.toBe(42);
  });

  it('does not start work that is already cancelled', async () => {
    const controller = new AbortController();
    const produce = vi.fn(async () => 'v');

    controller.abort();

    await expect(withAbortSignalCheck(controller.signal, produce)).rejects.toThrow();
    expect(produce).not.toHaveBeenCalled();
  });

  it('discards a value that arrives after an abort, then rejects', async () => {
    // The reason this helper exists: an ImageBitmap dropped here would leak its pixels.
    const controller = new AbortController();
    const discard = vi.fn();

    await expect(withAbortSignalCheck(
      controller.signal,
      async () => {
        controller.abort();

        return 'bitmap';
      },
      discard,
    )).rejects.toMatchObject({ name: 'AbortError' });

    expect(discard).toHaveBeenCalledWith('bitmap');
  });

  it('propagates a custom abort reason rather than flattening it into AbortError', async () => {
    const controller = new AbortController();

    controller.abort(new Error('superseded'));

    await expect(withAbortSignalCheck(controller.signal, async () => 'v'))
      .rejects.toThrow('superseded');
  });

  it('leaves a failing producer\'s error alone, with nothing to discard', async () => {
    const discard = vi.fn();

    await expect(withAbortSignalCheck(
      new AbortController().signal,
      async () => {
        throw new Error('boom');
      },
      discard,
    )).rejects.toThrow('boom');

    expect(discard).not.toHaveBeenCalled();
  });
});
