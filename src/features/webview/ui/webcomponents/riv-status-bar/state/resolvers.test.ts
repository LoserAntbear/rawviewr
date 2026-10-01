import { beforeEach, describe, expect, it } from 'vitest';

import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { PixelFormatPresets } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';
import { createWebviewStore } from '@features/webview/store/createWebviewStore';
import { StoreSliceId } from '@features/webview/store/definitions';
import type { ImageItem } from '@features/webview/store/slice/ImagesSlice';
import type { AppStore } from '@features/webview/store/types';
import type { FileSource } from '@features/webview/types';

import { SEGMENT_RESOLVERS } from '../view/segment/resolvers';
import { selectStatusBarContext } from './selectors';

/**
 * The bar reads what the store decoded, so these put image items in directly. Decoding has
 * its own tests; what is pinned here is what the bar makes of each outcome.
 */

const registry = new FormatRegistry(PixelFormatPresets.PRESETS, DEFAULT_DECODE_OPTIONS.format.id);

/** rgba4444 is 2 bytes a pixel, so a 4×3 frame is exactly 24 bytes. */
const geometry = (overrides: Partial<Geometry> = {}): Geometry => ({
  width: 4,
  height: 3,
  frameCount: 1,
  bytesPerRow: 8,
  bytesPerFrame: 24,
  availableBytes: 24,
  baseOffset: 0,
  lockedByHeader: false,
  ...overrides,
});

const ready = (id: string, overrides: Partial<Geometry> = {}, byteLength = 24): ImageItem => ({
  id,
  kind: 'ready',
  status: 'success',
  name: `${id}.raw`,
  detail: null,
  byteLength,
  geometry: geometry(overrides),
  image: { width: 4, height: 3, data: new Uint8ClampedArray(48) },
});

const source = (id: string): FileSource => ({ id, name: `${id}.raw`, uri: { path: `/${id}.raw` } as never });

let store: AppStore;

beforeEach(() => {
  ({ store } = createWebviewStore());
  store.get(StoreSliceId.DecodeOptions).setOptions({ format: PixelFormatPresets.getPreset('rgba4444'), width: 4, height: 3 });
});

function status(images: ImageItem[]) {
  store.get(StoreSliceId.Sources).upsert(images.map(({ id }) => source(id)));
  images.forEach((image) => store.get(StoreSliceId.Images).put(image.id, image));

  const context = selectStatusBarContext(store.state, registry);

  return { summary: SEGMENT_RESOLVERS.summary(context), notes: SEGMENT_RESOLVERS.notes(context) };
}

describe('status bar: single view', () => {
  it('summarises geometry, format, stride and size, and has nothing to note on an exact fit', () => {
    const { summary, notes } = status([ready('a')]);

    expect(summary).toEqual({ text: '4×3 · RGBA4444 · 8 B/row · 24 B', level: 'info' });
    expect(notes).toBeNull();
  });

  it('notes bytes left over after the last whole frame', () => {
    const { notes } = status([ready('a', { availableBytes: 30 }, 30)]);

    expect(notes).toEqual({ text: '6 B trailing bytes unused', level: 'info' });
  });

  it('warns when the buffer cannot fill even one frame', () => {
    const { notes } = status([ready('a', { availableBytes: 10 }, 10)]);

    expect(notes).toEqual({
      text: 'buffer is smaller than one frame — padded with transparent pixels',
      level: 'warn',
    });
  });

  it('counts frames only when there is more than one', () => {
    const { summary } = status([ready('a', { frameCount: 2, availableBytes: 48 }, 48)]);

    expect(summary?.text).toBe('4×3 · RGBA4444 · 8 B/row · 48 B · 2 frames');
  });

  it('names the format without the description some labels carry', () => {
    // The registry label is "RGBX4444 — alpha nibble ignored"; the bar has no room for it.
    store.get(StoreSliceId.DecodeOptions).setOptions({ format: PixelFormatPresets.getPreset('rgbx4444') });

    expect(status([ready('a')]).summary?.text).toBe('4×3 · RGBX4444 · 8 B/row · 24 B');
  });
});

describe('status bar: images that cannot be summarised', () => {
  it('says so while the bytes are still coming, and asks for a spinner', () => {
    const { summary, notes } = status([{ id: 'a', kind: 'pending' }]);

    expect(summary).toEqual({ text: 'loading…', level: 'info', loading: true });
    expect(notes).toBeNull();
  });

  it('reports a failure as an error, in both segments', () => {
    const { summary, notes } = status([{ id: 'a', kind: 'failed', message: 'permission denied' }]);

    expect(summary?.text).toBe('failed: permission denied');
    expect(notes).toEqual({ text: 'permission denied', level: 'error' });
  });

  it('shows nothing when there is no image at all', () => {
    expect(status([])).toEqual({ summary: null, notes: null });
  });
});

describe('status bar: gallery view', () => {
  it('counts the images that decoded, against the sources there are', () => {
    store.get(StoreSliceId.View).setMode('gallery');

    const { summary, notes } = status([
      ready('a'),
      { id: 'b', kind: 'pending' },
      { id: 'c', kind: 'failed', message: 'unreadable' },
    ]);

    expect(summary?.text).toBe('1 / 3 sources · RGBA4444');
    expect(notes?.text).toBe('double-click a tile to open it on its own');
  });
});
