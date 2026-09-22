import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BufferItemData } from '@features/buffer';
import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS, HeaderPreset } from '@features/image/imageDecoder/definitions';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import { GeometryResolver } from '@features/image/imageDecoder/imagePreparation/GeometryResolver';
import { createWebviewStore } from '@features/webview/store/createWebviewStore';
import { StoreSliceId } from '@features/webview/store/definitions';
import type { AppStore } from '@features/webview/store/types';

import { SEGMENT_RESOLVERS } from '../view/segment/resolvers';
import { selectStatusBarContext } from './selectors';

const registry = new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format);

/** rgba4444 is 2 bytes a pixel, so a 4×3 frame is exactly 24 bytes. */
const FRAME_4X3: Partial<DecodeOptions> = { format: 'rgba4444', width: 4, height: 3 };

let store: AppStore;

beforeEach(() => {
  ({ store } = createWebviewStore(registry));
});

const buffer = (id: string, bytes: number, overrides: Partial<BufferItemData> = {}): BufferItemData => ({
  id,
  name: `${id}.raw`,
  data: new ArrayBuffer(bytes),
  ...overrides,
});

/**
 * Options first, then the items: geometry is resolved by the store as each item lands, so
 * the bar only reads what is already on the item.
 */
function status(items: BufferItemData[], options: Partial<DecodeOptions> = FRAME_4X3) {
  store.get(StoreSliceId.Decode).setOptions(options);
  store.get(StoreSliceId.Sources).upsert(items);

  const context = selectStatusBarContext(store.state, registry);

  return { summary: SEGMENT_RESOLVERS.summary(context), notes: SEGMENT_RESOLVERS.notes(context) };
}

describe('status bar: single view', () => {
  it('summarises geometry, format, stride and size, and has nothing to note on an exact fit', () => {
    const { summary, notes } = status([buffer('a', 24)]);

    expect(summary).toEqual({ text: '4×3 · RGBA4444 · 8 B/row · 24 B', level: 'info' });
    expect(notes).toBeNull();
  });

  it('notes bytes left over after the last whole frame', () => {
    expect(status([buffer('a', 30)]).notes).toEqual({ text: '6 B trailing bytes unused', level: 'info' });
  });

  it('warns when the buffer cannot fill even one frame', () => {
    expect(status([buffer('a', 10)]).notes).toEqual({
      text: 'buffer is smaller than one frame — padded with transparent pixels',
      level: 'warn',
    });
  });

  it('counts frames only when there is more than one', () => {
    expect(status([buffer('a', 48)]).summary?.text).toBe('4×3 · RGBA4444 · 8 B/row · 48 B · 2 frames');
  });

  it('names the format without the description some labels carry', () => {
    // The registry label is "RGBX4444 — alpha nibble ignored"; the bar has no room for it.
    expect(status([buffer('a', 24)], { ...FRAME_4X3, format: 'rgbx4444' }).summary?.text)
      .toBe('4×3 · RGBX4444 · 8 B/row · 24 B');
  });

  it('follows the options: changing them re-resolves the geometry the bar reads', () => {
    status([buffer('a', 24)]);
    store.get(StoreSliceId.Decode).setOptions({ width: 2, height: 6 });

    const { summary } = { summary: SEGMENT_RESOLVERS.summary(selectStatusBarContext(store.state, registry)) };

    expect(summary?.text).toBe('2×6 · RGBA4444 · 4 B/row · 24 B');
  });
});

describe('status bar: buffers that cannot be summarised', () => {
  it('shows a buffer whose bytes are still in flight as loading, and says so', () => {
    const { summary, notes } = status([buffer('a', 0)]);

    expect(summary).toEqual({ text: 'a.raw · loading…', level: 'info', loading: true });
    expect(notes).toBeNull();
  });

  it('reports a buffer that failed to load as an error', () => {
    const { summary, notes } = status([buffer('a', 0, { error: 'permission denied' })]);

    expect(summary?.text).toBe('a.raw');
    expect(notes).toEqual({ text: 'permission denied', level: 'error' });
  });

  it('explains a header preset the bytes cannot satisfy, instead of throwing', () => {
    // A u16 header is two 2-byte fields; two bytes cannot hold it.
    const { notes } = status([buffer('a', 2)], { headerPreset: HeaderPreset.U16LE });

    expect(notes).toEqual({ text: 'Header preset needs 4 bytes, buffer has 2.', level: 'error' });
  });

  it('shows nothing when there is no buffer at all', () => {
    expect(status([])).toEqual({ summary: null, notes: null });
  });
});

describe('status bar: gallery view', () => {
  it('counts the buffers that have loaded, and says how to open one', () => {
    store.get(StoreSliceId.View).setMode('gallery');

    const { summary, notes } = status([
      buffer('a', 24),
      buffer('b', 0),
      buffer('c', 0, { error: 'unreadable' }),
    ]);

    expect(summary?.text).toBe('1 / 3 buffers · RGBA4444');
    expect(notes?.text).toBe('double-click a tile to open it on its own');
  });
});

describe('status bar: where geometry comes from', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['an item that failed to load', buffer('a', 0, { error: 'unreadable' })],
    ['a stub still loading', buffer('a', 0)],
  ])('never measures %s — there is nothing to measure', (_label, item) => {
    const resolveGeometry = vi.spyOn(GeometryResolver.prototype, 'resolveGeometry');

    status([item]);

    expect(resolveGeometry).not.toHaveBeenCalled();
  });

  it('measures a buffer once, when it arrives — not again for the bar', () => {
    const resolveGeometry = vi.spyOn(GeometryResolver.prototype, 'resolveGeometry');

    status([buffer('a', 24)]);
    selectStatusBarContext(store.state, registry);
    selectStatusBarContext(store.state, registry);

    expect(resolveGeometry).toHaveBeenCalledOnce();
  });
});
