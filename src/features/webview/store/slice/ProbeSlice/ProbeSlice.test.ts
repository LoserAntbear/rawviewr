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

/**
 * Pinning holds a reading still so the pointer can go elsewhere — and so the raw bytes
 * behind it are worth fetching, since a click is a decision and a sweep is not.
 */
describe('ProbeSlice: the pin', () => {
  const location = { bits: 16, bitOffset: 0, byteOffset: 6 } as const;
  const bytes = { bytes: [0x3c, 0x1f], value: 0x1f3c };

  it('starts with nothing held', () => {
    expect(probe().pinnedSample).toBeNull();
  });

  it('holds the pixel it was given, with its bytes still to come', () => {
    probe().togglePinnedSample(sample(3, 4));

    expect(probe().pinnedSample).toMatchObject({ id: 'a', position: { x: 3, y: 4 }, bytes: null });
  });

  it('lets go when the same pixel is clicked again', () => {
    probe().togglePinnedSample(sample(3, 4));
    probe().togglePinnedSample(sample(3, 4));

    expect(probe().pinnedSample).toBeNull();
  });

  it('moves to another pixel rather than letting go', () => {
    probe().togglePinnedSample(sample(3, 4));
    probe().togglePinnedSample(sample(5, 6));

    expect(probe().pinnedSample?.position).toEqual({ x: 5, y: 6 });
  });

  it('leaves the live reading alone: the two are read side by side', () => {
    probe().setActiveSample(sample(3, 4));
    probe().togglePinnedSample(sample(3, 4));
    probe().setActiveSample(sample(9, 9));

    expect(probe().activeSample?.position).toEqual({ x: 9, y: 9 });
    expect(probe().pinnedSample?.position).toEqual({ x: 3, y: 4 });
  });

  it('takes the bytes that answer what it asked about', () => {
    probe().togglePinnedSample(sample(3, 4));
    probe().setSourceBytesForPinnedSample('a', probe().pinnedSample!.location, bytes);

    expect(probe().pinnedSample?.sourceFileBytes).toEqual(bytes);
  });

  it('ignores an answer the pin has already moved on from', () => {
    probe().togglePinnedSample(sample(3, 4));

    const asked = probe().pinnedSample!.location;

    probe().togglePinnedSample(sample(5, 6));
    probe().setSourceBytesForPinnedSample('a', asked, bytes);

    // The reply is for a pixel nobody is looking at any more.
    expect(probe().pinnedSample?.sourceFileBytes).toBeNull();
  });

  it('ignores an answer that arrives after the pin is let go', () => {
    probe().togglePinnedSample(sample(3, 4));

    const asked = probe().pinnedSample!.location;

    probe().resetActiveSample();
    probe().setSourceBytesForPinnedSample('a', asked, bytes);

    expect(probe().pinnedSample).toBeNull();
  });

  it('ignores an answer for another tile at the same offset', () => {
    probe().togglePinnedSample(sample(3, 4, 'a'));
    probe().setSourceBytesForPinnedSample('b', { ...location, byteOffset: 6 }, bytes);

    expect(probe().pinnedSample?.sourceFileBytes).toBeNull();
  });
});

describe('ProbeSlice: asking for the bytes', () => {
  it('asks once, when a pin is made', () => {
    const asked = vi.fn();

    store.bus.on('probe:bytes:requested', (event) => asked(event.detail));
    probe().togglePinnedSample(sample(3, 4));

    expect(asked).toHaveBeenCalledWith({ id: 'a', location: { bits: 16, bitOffset: 0, byteOffset: 6 } });
  });

  it('does not ask again once the answer is in', () => {
    probe().togglePinnedSample(sample(3, 4));

    const asked = vi.fn();

    store.bus.on('probe:bytes:requested', asked);
    probe().setSourceBytesForPinnedSample('a', probe().pinnedSample!.location, { bytes: [1], value: 1 });

    expect(asked).not.toHaveBeenCalled();
  });

  it('does not ask again as the pointer moves while the read is in flight', () => {
    probe().togglePinnedSample(sample(3, 4));

    const asked = vi.fn();

    store.bus.on('probe:bytes:requested', asked);
    probe().setActiveSample(sample(9, 9));
    probe().setActiveSample(sample(8, 8));

    // A sweep changes the slice, and the pin is still waiting — but it already asked.
    expect(asked).not.toHaveBeenCalled();
  });

  it('asks nothing when a pin is let go', () => {
    probe().togglePinnedSample(sample(3, 4));

    const asked = vi.fn();

    store.bus.on('probe:bytes:requested', asked);
    probe().resetActiveSample();

    expect(asked).not.toHaveBeenCalled();
  });
});
