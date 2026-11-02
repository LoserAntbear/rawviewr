import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WebviewDisposable } from '@SHARED/features/disposable/types';
import { ViewerBackground } from '@SHARED/features/viewer/definitions';

import { createWebviewStore } from './createWebviewStore';
import { StoreSliceId } from './definitions';
import { ZOOM } from './slice/ViewSlice/definitions';
import type { AppStore, AppStoreState } from './types';

/**
 * The store is where "did the part I read actually change" lives, so the decision sits neither
 * in a slice — which cannot know who reads what — nor in whichever subscriber happened to be
 * woken up. These pin that it reports real movement and nothing else.
 *
 * Reactions are left out of every store here: they write back on their own, and the question
 * under test is what a subscriber is told, not what the app does with it.
 */

let store: AppStore;

const view = () => store.get(StoreSliceId.View);
const images = () => store.get(StoreSliceId.Images);

beforeEach(() => {
  ({ store } = createWebviewStore(undefined, []));
});

describe('ReactiveStore.state', () => {
  /** What lets a reader hold the state and compare it, instead of re-reading every field. */
  it('hands out the same object until something changes', () => {
    expect(store.state).toBe(store.state);
  });

  it('hands out a new one once a slice has moved', () => {
    const before = store.state;

    view().setZoom('in');

    expect(store.state).not.toBe(before);
  });

  /**
   * The premise the whole design rests on: a slice swaps its state and announces it in one step,
   * so a write that settles on the value already there announces nothing and nothing was stale.
   */
  it('keeps the object when a write changed nothing', () => {
    const before = store.state;

    view().setBackground(view().background);

    expect(store.state).toBe(before);
  });

  it('carries each slice by the reference the slice itself holds', () => {
    expect(store.state[StoreSliceId.Images]).toBe(images().getState());
  });
});

describe('ReactiveStore.subscribe', () => {
  it('reports the selection once on subscribing, before anything has changed', () => {
    const onChange = vi.fn();

    store.subscribe((state) => state[StoreSliceId.View].zoom, onChange);

    expect(onChange).toHaveBeenCalledExactlyOnceWith(view().zoom, undefined);
  });

  /**
   * The whole point of selecting. Every slice announcing into one bus means a subscriber hears
   * about work it has nothing to do with — a band of someone else's decode, on every band.
   */
  it('says nothing when a slice it does not read changes', () => {
    const onChange = vi.fn();

    store.subscribe((state) => state[StoreSliceId.View].zoom, onChange);
    onChange.mockClear();

    images().put('a', { id: 'a', kind: 'pending' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports the new selection when the part it reads moves', () => {
    const onChange = vi.fn();

    store.subscribe((state) => state[StoreSliceId.View].zoom, onChange);
    onChange.mockClear();

    view().setZoom('in');

    expect(onChange).toHaveBeenCalledExactlyOnceWith(view().zoom, ZOOM.default);
  });

  it('says nothing when a write leaves the slice where it was', () => {
    const onChange = vi.fn();

    store.subscribe((state) => state[StoreSliceId.View].zoom, onChange);
    onChange.mockClear();

    view().setZoom('reset');

    expect(onChange).not.toHaveBeenCalled();
  });

  /**
   * The case the toolbar needs: it reads five fields off four slices, so its selection is a
   * record built fresh on every read. Comparing that by identity would call every read a change.
   */
  it('reads a record one level deep, so a rebuilt projection is not a change', () => {
    const onChange = vi.fn();

    store.subscribe(
      (state) => ({ zoom: state[StoreSliceId.View].zoom, tile: state[StoreSliceId.Config].tileSize }),
      onChange,
    );
    onChange.mockClear();

    images().put('a', { id: 'a', kind: 'pending' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports a record when one of its fields moved', () => {
    const onChange = vi.fn();

    store.subscribe(
      (state) => ({ zoom: state[StoreSliceId.View].zoom, tile: state[StoreSliceId.Config].tileSize }),
      onChange,
    );
    onChange.mockClear();

    view().setZoom('in');

    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      { zoom: view().zoom, tile: 220 },
      { zoom: ZOOM.default, tile: 220 },
    );
  });

  /**
   * One level deep means one level: a change behind a field's reference is invisible. Which is
   * the constraint on a projection — read references off the state, do not build them.
   */
  it('does not look inside a field, which is why a projection has to stay flat', () => {
    const onChange = vi.fn();
    const nested = { total: 1 };

    store.subscribe(() => ({ nested }), onChange);
    onChange.mockClear();

    nested.total = 2;
    view().setZoom('in');

    expect(onChange).not.toHaveBeenCalled();
  });

  /** A selection going missing is the shape the per-id read returns for an item that was dropped. */
  it('compares anything that is not a record or a collection by identity', () => {
    const onChange = vi.fn();

    images().put('a', { id: 'a', kind: 'pending' });
    store.subscribe((state) => state[StoreSliceId.Images].byId.get('a'), onChange);
    onChange.mockClear();

    images().clear();

    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined, { id: 'a', kind: 'pending' });
  });

  /**
   * A set a selector derives, which is the only reason collections are compared by content: the
   * slices replace theirs wholesale, so those compare by reference for free.
   */
  it('compares a derived set by its entries rather than by the new object', () => {
    const onChange = vi.fn();

    images().put('a', { id: 'a', kind: 'pending' });
    store.subscribe((state) => new Set(state[StoreSliceId.Images].byId.keys()), onChange);
    onChange.mockClear();

    // The item moves on, so `byId` is a new map — but the set of ids in it has not changed.
    images().put('a', { id: 'a', kind: 'reading' });

    expect(onChange).not.toHaveBeenCalled();

    images().put('b', { id: 'b', kind: 'pending' });

    expect(onChange).toHaveBeenCalledExactlyOnceWith(new Set(['a', 'b']), new Set(['a']));
  });

  it('compares a derived map by its entries, values included', () => {
    const onChange = vi.fn();
    const kinds = (state: AppStoreState) => new Map(
      [...state[StoreSliceId.Images].byId].map(([id, item]) => [id, item.kind] as const),
    );

    images().put('a', { id: 'a', kind: 'pending' });
    store.subscribe(kinds, onChange);
    onChange.mockClear();

    images().put('a', { id: 'a', kind: 'pending' });

    expect(onChange).not.toHaveBeenCalled();

    images().put('a', { id: 'a', kind: 'reading' });

    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      new Map([['a', 'reading']]),
      new Map([['a', 'pending']]),
    );
  });

  /**
   * One key swapped for another leaves the entry count where it was, so the keys are all there is
   * to go on. Reading a missing key as an entry holding `undefined` would call these two maps
   * identical, and a missed report is the dangerous direction to be wrong in.
   */
  it('notices two maps that differ only in a key whose value is undefined', () => {
    const onChange = vi.fn();
    const keyed = (state: AppStoreState) => new Map([
      [state[StoreSliceId.View].zoom > ZOOM.default ? 'b' : 'a', undefined],
    ]);

    store.subscribe(keyed, onChange);
    onChange.mockClear();

    view().setZoom('in');

    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      new Map([['b', undefined]]),
      new Map([['a', undefined]]),
    );
  });

  /**
   * Why the record path is gated on the prototype: `Object.keys` of a typed array is every index
   * in it, so a band of pixels would be compared, and built into strings, byte by byte.
   */
  it('compares a typed array by identity rather than walking its indices', () => {
    const onChange = vi.fn();

    // The same bytes every time, in a new object every time. Walking the indices would read the
    // two as one and say nothing; by identity they differ, which is the cheap answer and the
    // safe one. Nothing is read off the state because the bytes are not the point here.
    store.subscribe(() => new Uint8ClampedArray([1, 2]), onChange);
    onChange.mockClear();

    view().setZoom('in');

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  /**
   * Two changes with nothing reading the state in between. Assembling it on demand would reach
   * for the slices only once the second change had landed, so the step from the first would be
   * reported as no step at all.
   */
  it('knows the state as it was even when nothing read it in between', () => {
    const onChange = vi.fn();

    store.subscribe((state) => state[StoreSliceId.View].zoom, onChange);
    onChange.mockClear();

    view().setZoom('in');
    view().setZoom('in');

    expect(onChange.mock.calls).toEqual([[2, 1], [4, 2]]);
  });

  it('stops reporting once disposed', () => {
    const onChange = vi.fn();
    const subscription = store.subscribe((state) => state[StoreSliceId.View].zoom, onChange);

    subscription.dispose();
    onChange.mockClear();

    view().setZoom('in');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('tells every subscriber, not just the first', () => {
    const first = vi.fn();
    const second = vi.fn();

    store.subscribe((state) => state[StoreSliceId.View].zoom, first);
    store.subscribe((state) => state[StoreSliceId.View].zoom, second);
    first.mockClear();
    second.mockClear();

    view().setZoom('in');

    expect([first, second].map((fn) => fn.mock.calls.length)).toEqual([1, 1]);
  });

  /** An element disconnecting on a render is an ordinary thing; it must not cost the next one. */
  it('still reaches the rest when a subscriber disposes itself while being told', () => {
    const second = vi.fn();
    const held: { subscription?: WebviewDisposable } = {};

    held.subscription = store.subscribe(
      (state) => state[StoreSliceId.View].zoom,
      () => held.subscription?.dispose(),
    );
    store.subscribe((state) => state[StoreSliceId.View].zoom, second);
    second.mockClear();

    view().setZoom('in');

    expect(second).toHaveBeenCalledTimes(1);
  });

  /** The reason the pass walks the live set: disposing is immediate, not "after this round". */
  it('does not reach a subscriber that another one disposed mid-pass', () => {
    const second = vi.fn();
    const held: { subscription?: WebviewDisposable } = {};

    store.subscribe(
      (state) => state[StoreSliceId.View].zoom,
      () => held.subscription?.dispose(),
    );
    held.subscription = store.subscribe((state) => state[StoreSliceId.View].zoom, second);
    second.mockClear();

    view().setZoom('in');

    expect(second).not.toHaveBeenCalled();
  });

  /**
   * A subscriber writing back mid-pass is what a reaction does, and whoever is told after it must
   * be told what is there now — not a state that has already been superseded, which would render
   * the change and then render it away again.
   */
  it('tells a later subscriber the state as it stands after an earlier one wrote to it', () => {
    const onChange = vi.fn();

    // Stands in for a reaction: hears one slice, writes to another.
    store.subscribe(
      (state) => state[StoreSliceId.View].zoom,
      (zoom) => view().setBackground(
        zoom > ZOOM.default ? ViewerBackground.magenta : ViewerBackground.black,
      ),
    );
    store.subscribe((state) => state[StoreSliceId.View].background, onChange);
    onChange.mockClear();

    view().setZoom('in');

    expect(onChange.mock.calls.map(([background]) => background)).toEqual([ViewerBackground.magenta]);
  });
});
