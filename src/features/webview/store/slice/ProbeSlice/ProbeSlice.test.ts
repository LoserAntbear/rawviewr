import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createWebviewStore } from '../../createWebviewStore';
import { StoreSliceId } from '../../definitions';
import type { AppStore } from '../../types';
import type { ProbeSample } from './types';

/**
 * The slice exists to keep pointer-rate traffic off `view:change`, which the gallery
 * reconciles on. What is pinned here is that it only speaks when the reading actually moved.
 */

let store: AppStore;

const probe = () => store.get(StoreSliceId.Probe);
const sample = (x: number, y: number, id = 'a'): ProbeSample => ({
  id,
  position: { x, y },
  rgba: { r: 1, g: 2, b: 3, a: 255 },
  location: { bits: 16, bitOffset: 0, byteOffset: x * 2 },
});

beforeEach(() => {
  ({ store } = createWebviewStore());
});

describe('ProbeSlice', () => {
  it('starts with nothing under the pointer', () => {
    expect(probe().activeSample).toBeNull();
  });

  it('keeps the reading it was given', () => {
    probe().setActiveSample(sample(3, 4));

    expect(probe().activeSample).toEqual(sample(3, 4));
  });

  it('announces a reading, so the bar can show it', () => {
    const changed = vi.fn();

    store.bus.on('probe:change', (event) => changed(event.detail.next.activeSample?.position));
    probe().setActiveSample(sample(3, 4));

    expect(changed).toHaveBeenCalledWith({ x: 3, y: 4 });
  });

  it('says nothing while the pointer stays on the same pixel', () => {
    const changed = vi.fn();

    probe().setActiveSample(sample(3, 4));
    store.bus.on('probe:change', changed);
    probe().setActiveSample(sample(3, 4));

    // The pointer reports many times per pixel, and a redundant reading re-renders the bar.
    expect(changed).not.toHaveBeenCalled();
  });

  it('speaks again as soon as the pixel changes', () => {
    const changed = vi.fn();

    probe().setActiveSample(sample(3, 4));
    store.bus.on('probe:change', changed);
    probe().setActiveSample(sample(3, 5));

    expect(changed).toHaveBeenCalledOnce();
  });

  it('tells two tiles apart on the same pixel', () => {
    const changed = vi.fn();

    probe().setActiveSample(sample(3, 4, 'a'));
    store.bus.on('probe:change', changed);
    probe().setActiveSample(sample(3, 4, 'b'));

    expect(changed).toHaveBeenCalledOnce();
  });

  it('clears when the pointer leaves', () => {
    probe().setActiveSample(sample(3, 4));
    probe().clearActiveSample();

    expect(probe().activeSample).toBeNull();
  });

  it('says nothing when clearing what is already clear', () => {
    const changed = vi.fn();

    store.bus.on('probe:change', changed);
    probe().clearActiveSample();

    expect(changed).not.toHaveBeenCalled();
  });
});
