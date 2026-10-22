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

  describe('batch', () => {
    /**
     * Both halves of a delta are one move. Published separately, the half-applied set goes out
     * as a state of its own — and downstream that reads as a window nobody was looking at.
     */
    it('publishes once, at the end', () => {
      const { set, seen } = watched<string>();

      set.add(['a', 'b']);
      seen.length = 0;

      set.batch(() => {
        set.add(['c']);
        set.delete(['a']);
      });

      expect(seen).toEqual([['b', 'c']]);
    });

    it('publishes nothing in the middle, even for a clear', () => {
      const { set, seen } = watched<string>();

      set.add(['a']);
      seen.length = 0;

      set.batch(() => {
        set.clear();
        set.add(['b']);
      });

      // Never `[]`: an empty window would evict everything before the next line put it back.
      expect(seen).toEqual([['b']]);
    });

    it('goes back to publishing after a batch throws', () => {
      const { set, seen } = watched<string>();

      expect(() => set.batch(() => {
        throw new Error('nope');
      })).toThrow('nope');

      seen.length = 0;
      set.add('a');

      expect(seen).toEqual([['a']]);
    });

    it('does not tell a listener that has unsubscribed', () => {
      const set = new ReactiveSet<string>();
      const listener = vi.fn();

      set.subscribe(listener);
      set.unsubscribe(listener);
      set.add('a');

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
