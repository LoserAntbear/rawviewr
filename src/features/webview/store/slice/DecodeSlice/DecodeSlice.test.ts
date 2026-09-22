import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BufferItemData } from '@features/buffer';
import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';

import { createWebviewStore } from '../createWebviewStore';
import { StoreSliceId } from '../definitions';
import type { AppStore } from '../types';
import { DecodeSlice } from './DecodeSlice';
import { ImagesSlice } from './ImagesSlice/ImagesSlice';
import { ItemsSlice } from './ItemsSlice';
import { ViewSlice } from './ViewSlice';

/** The slice holds the decoder, so it is where a buffer gets measured — exactly once. */

const registry = new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format);
const geometry = { width: 4, height: 3, bytesPerRow: 8 } as Geometry;

let decoder: { resolveGeometry: ReturnType<typeof vi.fn>; decode: ReturnType<typeof vi.fn> };
let store: AppStore;

beforeEach(() => {
  decoder = { resolveGeometry: vi.fn(() => geometry), decode: vi.fn(async () => 'bitmap') };
  ({ store } = createWebviewStore(registry, {
    [StoreSliceId.View]: new ViewSlice(),
    [StoreSliceId.Items]: new ItemsSlice(),
    [StoreSliceId.Decode]: new DecodeSlice(decoder as never),
    [StoreSliceId.Images]: new ImagesSlice(),
  }));
});

const item = (bytes: number, overrides: Partial<BufferItemData> = {}): BufferItemData => ({
  id: 'a',
  name: 'a.raw',
  data: new ArrayBuffer(bytes),
  ...overrides,
});

const decode = () => store.get(StoreSliceId.Decode);
const stored = () => store.get(StoreSliceId.Items).getItem('a');

describe('DecodeSlice.resolveGeometry', () => {
  it('turns a resolver throw into a failure to show, rather than one to catch', () => {
    decoder.resolveGeometry.mockImplementation(() => {
      throw new Error('header does not fit');
    });

    expect(decode().resolveGeometry(item(24))).toEqual({ kind: 'failed', message: 'header does not fit' });
  });

  it('has nothing to measure without bytes', () => {
    expect(decode().resolveGeometry(item(0))).toEqual({ kind: 'pending' });
    expect(decoder.resolveGeometry).not.toHaveBeenCalled();
  });
});

describe('DecodeSlice.decode', () => {
  it('hands the decoder the geometry already stored on the item, rather than measuring again', async () => {
    store.get(StoreSliceId.Items).upsert([item(24)]);

    await decode().decode(stored());

    expect(decoder.resolveGeometry).toHaveBeenCalledOnce();
    expect(decoder.decode).toHaveBeenCalledWith(stored()?.data, decode().options, undefined, geometry);
  });

  it('does not decode a buffer whose geometry is still pending', async () => {
    store.get(StoreSliceId.Items).upsert([item(0)]);

    await expect(decode().decode(stored())).resolves.toBeNull();
    expect(decoder.decode).not.toHaveBeenCalled();
  });
});
