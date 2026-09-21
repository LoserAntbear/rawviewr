import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TypedEventTarget } from '../../TypedEventTarget';
import { ImagesSlice } from './ImagesSlice';

/**
 * The slice is the only owner of an `ImageBitmap`. Everything it drops, it closes — that is
 * what lets every component hold one without a lifetime rule of its own.
 */

type FakeBitmap = ImageBitmap & { close: ReturnType<typeof vi.fn> };

const bitmap = (): FakeBitmap => ({ width: 4, height: 3, close: vi.fn() } as unknown as FakeBitmap);

let images: ImagesSlice;
let bus: TypedEventTarget<Record<string, unknown>>;

beforeEach(() => {
  images = new ImagesSlice();
  bus = new TypedEventTarget();
  images.attach(bus);
});

describe('ImagesSlice', () => {
  it('closes the bitmap it displaces', () => {
    const first = bitmap();

    images.put('a', { kind: 'ready', bitmap: first });
    images.put('a', { kind: 'ready', bitmap: bitmap() });

    expect(first.close).toHaveBeenCalledOnce();
  });

  it('keeps a bitmap that is stored again, since the canvas is still showing it', () => {
    const shown = bitmap();

    images.put('a', { kind: 'ready', bitmap: shown });
    images.put('a', { kind: 'ready', bitmap: shown });

    expect(shown.close).not.toHaveBeenCalled();
  });

  it('closes a bitmap replaced by a state that has no pixels', () => {
    const shown = bitmap();

    images.put('a', { kind: 'ready', bitmap: shown });
    images.put('a', { kind: 'failed', message: 'gone' });

    expect(shown.close).toHaveBeenCalledOnce();
  });

  it('drops and closes everything outside what it is told to keep', () => {
    const kept = bitmap();
    const dropped = bitmap();

    images.put('a', { kind: 'ready', bitmap: kept });
    images.put('b', { kind: 'ready', bitmap: dropped });
    images.clearAllExcept(['a']);

    expect(dropped.close).toHaveBeenCalledOnce();
    expect(kept.close).not.toHaveBeenCalled();
    expect([...images.getState().byId.keys()]).toEqual(['a']);
  });

  it('stays quiet when nothing is dropped, so a repeated pass wakes nobody', () => {
    const changes = vi.fn();

    images.put('a', { kind: 'pending' });
    bus.addEventListener('images:change', changes);

    const state = images.getState();

    images.clearAllExcept(['a']);

    expect(images.getState()).toBe(state);
    expect(changes).not.toHaveBeenCalled();
  });

  it('closes everything on clear', () => {
    const first = bitmap();
    const second = bitmap();

    images.put('a', { kind: 'ready', bitmap: first });
    images.put('b', { kind: 'ready', bitmap: second });
    images.clear();

    expect([first.close, second.close].map((close) => close.mock.calls.length)).toEqual([1, 1]);
    expect(images.getState().byId.size).toBe(0);
  });
});
