import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ViewerBackground } from '@features/viewer/definitions';

import { createWebviewStore } from '../../createWebviewStore';
import { StoreSliceId } from '../../definitions';
import type { AppStore } from '../../types';
import { ZOOM } from './definitions';
import { resolveZoom } from './utils';

/**
 * Zoom is the one piece of view state with arithmetic in it, so the sums are pinned on the
 * pure function and the emitting on the slice. The caps matter twice over: they stop the
 * layout box growing past what a compositor can take, and a step that cannot move must not
 * announce a change — the toolbar and the bar both re-render on every one.
 */

let store: AppStore;

const view = () => store.get(StoreSliceId.View);

beforeEach(() => {
  ({ store } = createWebviewStore());
});

describe('resolveZoom', () => {
  it.each([
    ['in', 1, 2],
    ['in', 0.25, 0.5],
    ['out', 1, 0.5],
    ['out', 4, 2],
    ['reset', 8, ZOOM.default],
    ['reset', 0.25, ZOOM.default],
  ] as const)('%s from %f lands on %f', (direction, current, expected) => {
    expect(resolveZoom(current, direction)).toBe(expected);
  });

  it('stops at the ends rather than running past them', () => {
    expect(resolveZoom(ZOOM.max, 'in')).toBe(ZOOM.max);
    expect(resolveZoom(ZOOM.min, 'out')).toBe(ZOOM.min);
  });

  /** Multiplicative steps, so a round trip is exact — no drift to accumulate. */
  it('comes back to where it started after in and out', () => {
    expect(resolveZoom(resolveZoom(1, 'in'), 'out')).toBe(1);
  });
});

describe('ViewSlice zoom', () => {
  it('starts at one screen pixel per image pixel', () => {
    expect(view().zoom).toBe(ZOOM.default);
  });

  it('steps, and reports the new factor', () => {
    const changed = vi.fn();

    store.bus.on('view:change', (event) => changed(event.detail.next.zoom));

    view().setZoom('in');
    view().setZoom('in');

    expect(view().zoom).toBe(4);
    expect(changed).toHaveBeenNthCalledWith(2, 4);
  });

  it('says nothing when a step cannot move it any further', () => {
    const changed = vi.fn();

    while (view().zoom < ZOOM.max) {
      view().setZoom('in');
    }

    store.bus.on('view:change', changed);
    view().setZoom('in');

    expect(view().zoom).toBe(ZOOM.max);
    expect(changed).not.toHaveBeenCalled();
  });

  it('says nothing when reset is asked for at 1:1', () => {
    const changed = vi.fn();

    store.bus.on('view:change', changed);
    view().setZoom('reset');

    expect(changed).not.toHaveBeenCalled();
  });

  it('leaves the mode alone, and the mode leaves it alone', () => {
    view().setZoom('in');
    view().setMode('gallery');

    expect(view().getState()).toEqual({ mode: 'gallery', zoom: 2, background: ViewerBackground.checker });
  });
});
