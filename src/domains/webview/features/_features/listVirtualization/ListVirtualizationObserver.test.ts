import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type FakeIntersectionObserver,
  installFakeIntersectionObserver,
} from '@root/test/mocks/intersectionObserver';

import {
  CROSSCHECK_DELAY_MS,
  INTERSECTION_OBSERVER_CONFIG,
  ListVirtualizationObserver,
} from './ListVirtualizationObserver';

/**
 * The window this keeps is built from DELTAS. A pass names only the tiles whose threshold index
 * moved, so everything here is about what survives a pass that stayed silent about it — the
 * mistake costs a gallery its whole viewport on every scroll notch.
 */
let root: HTMLElement;
let instances: FakeIntersectionObserver[];
let reported: string[][];
let observer: ListVirtualizationObserver;

const tile = (id: string): HTMLElement => {
  const element = document.createElement('li');

  element.dataset.itemId = id;
  root.appendChild(element);

  return element;
};

beforeEach(() => {
  vi.useFakeTimers();
  ({ instances } = installFakeIntersectionObserver());

  root = document.createElement('div');
  document.body.replaceChildren(root);
  reported = [];
  observer = new ListVirtualizationObserver(root, (ids) => reported.push(ids));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Publication waits for the scrolling to stop, so every assertion about it waits too. */
const settle = () => vi.advanceTimersByTime(CROSSCHECK_DELAY_MS);

const io = (): FakeIntersectionObserver => {
  const [first] = instances;

  if (!first) {
    throw new Error('no observer was built');
  }

  return first;
};

const latest = () => reported.at(-1) ?? [];

describe('ListVirtualizationObserver', () => {
  it('roots the observer where it was told to', () => {
    expect(io().root).toBe(root);
  });

  it('keeps the config it was given, with the root added', () => {
    expect(io().options).toMatchObject({ ...INTERSECTION_OBSERVER_CONFIG, root });
  });

  it('watches what it is handed, and only once each', () => {
    const one = tile('a');

    observer.observe([one, tile('b')]);
    observer.observe([one]);

    expect(io().targets).toHaveLength(2);
  });

  /** The first pass names every target, so filtering it is the whole startup window. */
  it('seeds the window from the first pass, keeping only what intersects', () => {
    const [a, b, c] = [tile('a'), tile('b'), tile('c')];

    observer.observe([a, b, c]);
    io().reportFirstPass([a, b]);
    settle();

    expect(latest()).toEqual(['a', 'b']);
  });

  /**
   * The regression this file exists for: a later pass names seven tiles, and rebuilding the set
   * from it would drop the forty the pass said nothing about.
   */
  it('keeps what a later pass stayed silent about', () => {
    const [a, b, c] = [tile('a'), tile('b'), tile('c')];

    observer.observe([a, b, c]);
    io().reportFirstPass([a, b]);

    io().report([[c, true]]);
    settle();

    expect(latest()).toEqual(['a', 'b', 'c']);
  });

  it('lets go of a tile a pass reports as gone', () => {
    const [a, b] = [tile('a'), tile('b')];

    observer.observe([a, b]);
    io().reportFirstPass([a, b]);

    io().report([[a, false]]);
    settle();

    expect(latest()).toEqual(['b']);
  });

  it('takes both halves of a pass at once', () => {
    const [a, b, c] = [tile('a'), tile('b'), tile('c')];

    observer.observe([a, b, c]);
    io().reportFirstPass([a, b]);

    io().report([[a, false], [c, true]]);
    settle();

    expect(latest()).toEqual(['b', 'c']);
  });

  /**
   * Both halves are one move. Published separately, the half-applied window goes downstream as
   * a state of its own, and a decode window reacts to it.
   */
  it('speaks once per pass, whatever moved', () => {
    const [a, b, c] = [tile('a'), tile('b'), tile('c')];

    observer.observe([a, b, c]);
    io().reportFirstPass([a, b]);

    settle();

    const before = reported.length;

    io().report([[a, false], [c, true]]);
    settle();

    expect(reported.length - before).toBe(1);
  });

  it('never publishes an empty window on the way to a full one', () => {
    const [a, b, c] = [tile('a'), tile('b'), tile('c')];

    observer.observe([a, b, c]);
    io().reportFirstPass([a, b]);
    settle();
    io().report([[c, true]]);
    settle();

    expect(reported.filter((ids) => ids.length === 0)).toEqual([]);
  });

  it('ignores a target carrying no item id, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const named = tile('a');
    const nameless = document.createElement('li');

    root.appendChild(nameless);
    observer.observe([named, nameless]);
    io().reportFirstPass([named, nameless]);
    settle();

    expect(latest()).toEqual(['a']);
    expect(warn).toHaveBeenCalled();
  });

  it('hands back a copy, so a reader cannot edit the window', () => {
    const a = tile('a');

    observer.observe([a]);
    io().reportFirstPass([a]);
    settle();

    (observer.intersectingIds as Set<string>).add('forged');

    expect([...observer.intersectingIds]).toEqual(['a']);
  });

  it('stops observing when disposed', () => {
    observer.dispose();

    expect(io().disconnected).toBe(true);
  });

  it('drops a tile it was told to stop watching', () => {
    const [a, b] = [tile('a'), tile('b')];

    observer.observe([a, b]);
    observer.unobserve([a]);

    expect(io().targets).toEqual([b]);
  });
});

/**
 * The window is folded from every pass, but published only once the scrolling stops. The split
 * is the whole point: folding is two set operations and tells nobody, while publishing is what
 * turns into decode work. Debouncing the fold instead would drop the increments of every pass
 * it swallowed, and tiles sitting on screen would never be asked for.
 */
describe('ListVirtualizationObserver: publishing once the scrolling settles', () => {
  it('says nothing at all until the window holds still', () => {
    const a = tile('a');

    observer.observe([a]);
    io().reportFirstPass([a]);

    expect(reported).toEqual([]);

    vi.advanceTimersByTime(CROSSCHECK_DELAY_MS - 1);

    expect(reported).toEqual([]);
  });

  it('turns a burst of passes into one publication', () => {
    const [a, b, c] = [tile('a'), tile('b'), tile('c')];

    observer.observe([a, b, c]);

    io().report([[a, true]]);
    vi.advanceTimersByTime(10);
    io().report([[b, true]]);
    vi.advanceTimersByTime(10);
    io().report([[c, true]]);
    settle();

    expect(reported).toHaveLength(1);
  });

  /** The regression: three passes inside one window used to publish only the last one's ids. */
  it('publishes every tile the burst reported, not just the last pass', () => {
    const [a, b, c, d] = [tile('a'), tile('b'), tile('c'), tile('d')];

    observer.observe([a, b, c, d]);

    io().report([[a, true], [b, true]]);
    vi.advanceTimersByTime(10);
    io().report([[c, true]]);
    vi.advanceTimersByTime(10);
    io().report([[d, true]]);
    settle();

    expect(latest()).toEqual(['a', 'b', 'c', 'd']);
  });

  /**
   * What the wait is for: a tile crossed on the way past and was gone before the dust settled.
   * Decoding it would be work nobody ever sees.
   */
  it('never names a tile that arrived and left inside one window', () => {
    const [a, passing] = [tile('a'), tile('passing')];

    observer.observe([a, passing]);
    io().reportFirstPass([a, passing]);
    vi.advanceTimersByTime(10);
    io().report([[passing, false]]);
    settle();

    expect(reported.flat()).not.toContain('passing');
    // And not vacuous: what stayed is published.
    expect(latest()).toEqual(['a']);
  });

  /**
   * A decorator replaces the method on the prototype, so one function serves every instance.
   * A shared timer would mean one list's publication cancelling another's — and this class is
   * named for reuse, so a second list is the point of it.
   */
  it('keeps its own window, so one list cannot silence another', () => {
    const second: string[][] = [];
    const otherRoot = document.createElement('div');

    document.body.appendChild(otherRoot);

    const otherObserver = new ListVirtualizationObserver(otherRoot, (ids) => second.push(ids));
    const mine = tile('mine');
    const theirs = document.createElement('li');

    theirs.dataset.itemId = 'theirs';
    otherRoot.appendChild(theirs);

    observer.observe([mine]);
    otherObserver.observe([theirs]);

    io().reportFirstPass([mine]);
    vi.advanceTimersByTime(10);
    instances[1]!.reportFirstPass([theirs]);
    settle();

    expect([latest(), second.at(-1)]).toEqual([['mine'], ['theirs']]);
  });

  it('stays quiet when a publication was already scheduled and it got disposed', () => {
    const a = tile('a');

    observer.observe([a]);
    io().reportFirstPass([a]);
    observer.dispose();
    settle();

    // The timer still fires; a disposed observer just has nobody left to tell.
    expect(reported).toEqual([]);
  });
});
