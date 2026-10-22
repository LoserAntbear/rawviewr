import { describe, expect, it, vi } from 'vitest';

import { ReactiveSet } from './ReactiveSet';

const watched = <T>() => {
  const set = new ReactiveSet<T>();
  const seen: T[][] = [];

  set.subscribe((values) => seen.push(values));

  return { set, seen };
};

describe('ReactiveSet', () => {
  it('publishes what it holds after an add', () => {
    const { set, seen } = watched<string>();

    set.add('a');

    expect(seen).toEqual([['a']]);
  });

  it('publishes a batch of adds once', () => {
    const { set, seen } = watched<string>();

    set.add(['a', 'b']);

    expect(seen).toEqual([['a', 'b']]);
  });

  /**
   * It used to stop at the first value it did not hold, so deleting a mixed batch left the
   * rest behind — and the observer's "these have left the viewport" list is exactly that.
   */
  it('deletes every member of a batch, even past one it never held', () => {
    const { set } = watched<string>();

    set.add(['a', 'b', 'c']);
    set.delete(['absent', 'a', 'c']);

    expect([...set]).toEqual(['b']);
  });

  it('reports whether a batch removed anything', () => {
    const { set } = watched<string>();

    set.add('a');

    expect(set.delete(['absent', 'a'])).toBe(true);
    expect(set.delete(['absent'])).toBe(false);
  });

  it('does not tell a listener that has unsubscribed', () => {
    const set = new ReactiveSet<string>();
    const listener = vi.fn();

    set.subscribe(listener);
    set.unsubscribe(listener);
    set.add('a');

    expect(listener).not.toHaveBeenCalled();
  });

  /**
   * Both halves of a change are one move. Published separately, the half-applied set goes out
   * as a state of its own — holding what is on its way out and what is on its way in at once.
   * Downstream that reads as a window somebody was looking at, and gets decoded.
   */
  describe('refine', () => {
    it('publishes once, with both halves applied', () => {
      const { set, seen } = watched<string>();

      set.add(['a', 'b']);
      seen.length = 0;

      set.refine(['c'], ['a']);

      expect(seen).toEqual([['b', 'c']]);
    });

    it('never puts out the half-applied set on the way there', () => {
      const { set, seen } = watched<string>();

      set.add(['a', 'b']);
      seen.length = 0;

      set.refine(['c'], ['a']);

      // `['a','b','c']` would name a leaving member and an arriving one in the same breath.
      expect(seen.flat()).not.toContain('a');
    });

    it('takes an arrival with nothing leaving', () => {
      const { set, seen } = watched<string>();

      set.refine(['a']);

      expect(seen).toEqual([['a']]);
    });

    it('leaves the set alone when neither side names anything', () => {
      const { set } = watched<string>();

      set.add(['a']);
      set.refine([], []);

      expect([...set]).toEqual(['a']);
    });
  });
});
