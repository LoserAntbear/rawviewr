import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type FakeIntersectionObserver,
  installFakeIntersectionObserver,
} from '../../../../test/mocks/intersectionObserver';

import { INTERSECTION_OBSERVER_CONFIG, ListVirtualizationObserver } from './ListVirtualizationObserver';

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
  ({ instances } = installFakeIntersectionObserver());

  root = document.createElement('div');
  document.body.replaceChildren(root);
  reported = [];
  observer = new ListVirtualizationObserver(root, (ids) => reported.push(ids));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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

    expect(latest()).toEqual(['a', 'b', 'c']);
  });

  it('lets go of a tile a pass reports as gone', () => {
    const [a, b] = [tile('a'), tile('b')];

    observer.observe([a, b]);
    io().reportFirstPass([a, b]);

    io().report([[a, false]]);

    expect(latest()).toEqual(['b']);
  });

  it('takes both halves of a pass at once', () => {
    const [a, b, c] = [tile('a'), tile('b'), tile('c')];

    observer.observe([a, b, c]);
    io().reportFirstPass([a, b]);

    io().report([[a, false], [c, true]]);

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

    const before = reported.length;

    io().report([[a, false], [c, true]]);

    expect(reported.length - before).toBe(1);
  });

  it('never publishes an empty window on the way to a full one', () => {
    const [a, b, c] = [tile('a'), tile('b'), tile('c')];

    observer.observe([a, b, c]);
    io().reportFirstPass([a, b]);
    io().report([[c, true]]);

    expect(reported.filter((ids) => ids.length === 0)).toEqual([]);
  });

  it('ignores a target carrying no item id, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const named = tile('a');
    const nameless = document.createElement('li');

    root.appendChild(nameless);
    observer.observe([named, nameless]);
    io().reportFirstPass([named, nameless]);

    expect(latest()).toEqual(['a']);
    expect(warn).toHaveBeenCalled();
  });

  it('hands back a copy, so a reader cannot edit the window', () => {
    const a = tile('a');

    observer.observe([a]);
    io().reportFirstPass([a]);

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
