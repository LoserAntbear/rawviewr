import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BufferItemData } from '@features/buffer';
import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';

import { createWebviewStore } from '../store/createWebviewStore';
import { StoreSliceId } from '../store/definitions';
import { DecodeSlice } from '../store/slice/DecodeSlice';
import { ImagesSlice } from '../store/slice/ImagesSlice/ImagesSlice';
import { SourcesSlice } from '../store/slice/SourcesSlice/SourcesSlice';
import { ViewSlice } from '../store/slice/ViewSlice';
import type { AppStore } from '../store/types';

/**
 * The whole asynchronous pipeline lives in one place, so this is where it is pinned: what
 * is decoded, what is dropped, what is closed, and what happens when the options move
 * under a decode that is already running.
 */

type FakeBitmap = ImageBitmap & { close: ReturnType<typeof vi.fn> };

const registry = new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format);
const geometry = { width: 4, height: 3, bytesPerRow: 8 } as Geometry;

const bitmap = (): FakeBitmap => ({ width: 4, height: 3, close: vi.fn() } as unknown as FakeBitmap);

const fakeDecoder = () => ({
  resolveGeometry: vi.fn((): Geometry => geometry),
  decode: vi.fn<(data: ArrayBuffer, options: unknown, signal?: AbortSignal) => Promise<ImageBitmap | null>>(
    async () => bitmap(),
  ),
});

/**
 * A decode the test finishes by hand. Timing a real one out is a race — `vi.waitFor` polls
 * every 50ms, by which point a short decode has long since landed.
 */
function heldDecode() {
  let land: (bitmap: ImageBitmap) => void = () => undefined;
  const promise = new Promise<ImageBitmap | null>((resolve) => {
    land = resolve;
  });

  return { promise, land };
}

/** A decode that never lands, so nothing displaces what is already stored. */
const never = () => new Promise<ImageBitmap | null>(() => undefined);

let decoder: ReturnType<typeof fakeDecoder>;
let store: AppStore;

beforeEach(() => {
  decoder = fakeDecoder();

  ({ store } = createWebviewStore(registry, {
    [StoreSliceId.View]: new ViewSlice(),
    [StoreSliceId.Sources]: new SourcesSlice(),
    [StoreSliceId.Decode]: new DecodeSlice(decoder as never),
    [StoreSliceId.Images]: new ImagesSlice(),
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

const item = (id: string, overrides: Partial<BufferItemData> = {}): BufferItemData => ({
  id,
  name: `${id}.raw`,
  data: new ArrayBuffer(24),
  ...overrides,
});

const images = () => store.get(StoreSliceId.Images);
const show = (...items: BufferItemData[]) => store.get(StoreSliceId.Sources).upsert(items);
const ready = (id: string) => vi.waitFor(() => {
  expect(images().getImage(id)?.kind).toBe('ready');
});

describe('VisibleImageDecoder: what is on screen', () => {
  it('decodes the item being shown and keeps the bitmap in the store', async () => {
    show(item('a'));

    await ready('a');

    expect(decoder.decode).toHaveBeenCalledOnce();
  });

  it('decodes one buffer once, though the change reaches it as two events', async () => {
    // The arrival, then geometry written back onto the item.
    show(item('a'));

    await ready('a');
    await vi.waitFor(() => expect(decoder.decode).toHaveBeenCalledTimes(1));
  });

  it('decodes every item in gallery mode', async () => {
    store.get(StoreSliceId.View).setMode('gallery');
    show(item('a'), item('b'));

    await ready('a');
    await ready('b');
  });

  it('drops and closes what leaves the screen', async () => {
    show(item('a'), item('b'));
    await ready('a');

    const shown = images().getImage('a');

    store.get(StoreSliceId.View).select('b');

    await vi.waitFor(() => expect(images().getImage('a')).toBeUndefined());
    expect(shown?.kind === 'ready' && (shown.bitmap as FakeBitmap).close).toHaveBeenCalledOnce();
  });

  it('decodes as soon as a buffer that arrived empty has been measured', async () => {
    show(item('a', { data: new ArrayBuffer(0) }));
    await vi.waitFor(() => expect(images().getImage('a')).toEqual({ kind: 'pending' }));

    show(item('a'));

    await ready('a');
  });

  it('decodes again when the item is replaced by a newer version of itself', async () => {
    show(item('a'));
    await ready('a');

    show(item('a'));

    await vi.waitFor(() => expect(decoder.decode).toHaveBeenCalledTimes(2));
  });

  it('waits rather than decoding a buffer that has not been measured', async () => {
    show(item('a', { data: new ArrayBuffer(0) }));

    await vi.waitFor(() => expect(images().getImage('a')).toEqual({ kind: 'pending' }));
    expect(decoder.decode).not.toHaveBeenCalled();
  });
});

describe('VisibleImageDecoder: when the options move', () => {
  it('decodes again, closing the pixels that are now out of date', async () => {
    show(item('a'));
    await ready('a');

    const stale = images().getImage('a');

    store.get(StoreSliceId.Decode).setOptions({ width: 2, height: 6 });

    await vi.waitFor(() => expect(decoder.decode).toHaveBeenCalledTimes(2));
    expect(stale?.kind === 'ready' && (stale.bitmap as FakeBitmap).close).toHaveBeenCalledOnce();
    await ready('a');
  });

  it('closes a bitmap that arrives after its turn has passed, rather than showing it', async () => {
    const late = bitmap();
    const held = heldDecode();

    // The replacement never lands, so only the staleness check can dispose of the late one.
    decoder.decode.mockImplementationOnce(() => held.promise).mockImplementationOnce(never);

    show(item('a'));
    // The options have to move while the decode is in flight, not before it starts.
    await vi.waitFor(() => expect(decoder.decode).toHaveBeenCalledOnce());

    store.get(StoreSliceId.Decode).setOptions({ width: 2, height: 6 });
    held.land(late);

    await vi.waitFor(() => expect(late.close).toHaveBeenCalledOnce());
    expect(images().getImage('a')).toEqual({ kind: 'pending' });
  });
});

describe('VisibleImageDecoder: decodes that outlive their turn', () => {
  it('aborts the decode of an item that leaves the screen', async () => {
    let signal: AbortSignal | undefined;

    decoder.decode.mockImplementationOnce((...args) => {
      [, , signal] = args;

      return never();
    });

    show(item('a'), item('b'));
    await vi.waitFor(() => expect(signal).toBeDefined());

    store.get(StoreSliceId.View).select('b');

    // The pass is scheduled on a microtask, so the abort lands just after the selection.
    await vi.waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it('closes a bitmap for an item that left the screen while it was decoding, and stores nothing', async () => {
    const late = bitmap();
    const held = heldDecode();

    decoder.decode.mockImplementationOnce(() => held.promise).mockImplementationOnce(never);

    show(item('a'), item('b'));
    await vi.waitFor(() => expect(decoder.decode).toHaveBeenCalledOnce());

    store.get(StoreSliceId.View).select('b');
    held.land(late);

    await vi.waitFor(() => expect(late.close).toHaveBeenCalledOnce());
    expect(images().getImage('a')).toBeUndefined();
  });

  it('decodes each item once, and leaves the others alone when one arrives', async () => {
    store.get(StoreSliceId.View).setMode('gallery');
    show(item('a'));
    await ready('a');

    show(item('b'));
    await ready('b');

    expect(decoder.decode).toHaveBeenCalledTimes(2);
  });
});

describe('VisibleImageDecoder: failures', () => {
  it('records a failed decode as something to show, rather than throwing into the void', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    decoder.decode.mockRejectedValue(new Error('no 2d context'));

    show(item('a'));

    await vi.waitFor(() => expect(images().getImage('a')).toEqual({ kind: 'failed', message: 'no 2d context' }));
  });

  it('passes a refused measurement straight through, without attempting a decode', async () => {
    decoder.resolveGeometry.mockImplementation(() => {
      throw new Error('Header preset needs 4 bytes, buffer has 2.');
    });

    show(item('a'));

    await vi.waitFor(() => expect(images().getImage('a')).toEqual({
      kind: 'failed',
      message: 'Header preset needs 4 bytes, buffer has 2.',
    }));
    expect(decoder.decode).not.toHaveBeenCalled();
  });

  it('shows an item that never loaded as its own failure', async () => {
    show(item('a', { error: 'permission denied' }));

    await vi.waitFor(() => expect(images().getImage('a')).toEqual({ kind: 'failed', message: 'permission denied' }));
  });
});
