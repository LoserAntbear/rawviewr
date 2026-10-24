import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { VirtualListSlice } from './VirtualListSlice';

/**
 * The gallery hands this the same mutable set on every observer pass, so the slice has to be
 * the one that decides whether anything actually moved. Getting that wrong either silences the
 * decode window or re-runs it on every scroll tick.
 */
let slice: VirtualListSlice;
let changed: Mock<(type: string, payload: unknown) => void>;

beforeEach(() => {
  slice = new VirtualListSlice();
  changed = vi.fn();
  slice.attach({ emit: (type: string, payload: unknown) => changed(type, payload) } as never);
});

describe('VirtualListSlice', () => {
  it('starts out with nothing on screen', () => {
    expect([...slice.ids]).toEqual([]);
  });

  it('takes what the observer reported', () => {
    slice.setIds(new Set(['a', 'b']));

    expect([...slice.ids]).toEqual(['a', 'b']);
    expect(changed).toHaveBeenCalledOnce();
  });

  it('says nothing when the same ids come round again', () => {
    slice.setIds(new Set(['a', 'b']));
    changed.mockClear();

    slice.setIds(new Set(['b', 'a']));

    // Order is not membership: a re-reported set in another order is the same window.
    expect(changed).not.toHaveBeenCalled();
  });

  it('notices a swap that leaves the size alone', () => {
    slice.setIds(new Set(['a', 'b']));
    changed.mockClear();

    slice.setIds(new Set(['a', 'c']));

    expect(changed).toHaveBeenCalledOnce();
  });

  /**
   * The caller keeps one live set and mutates it between passes. Stored by reference, the
   * state would move underneath the comparison that decides whether to emit — and then every
   * later pass would look unchanged.
   */
  it('copies what it is given, so the caller cannot edit the state from outside', () => {
    const live = new Set(['a']);

    slice.setIds(live);
    live.add('b');

    expect([...slice.ids]).toEqual(['a']);

    changed.mockClear();
    slice.setIds(live);

    expect(changed).toHaveBeenCalledOnce();
  });
});
