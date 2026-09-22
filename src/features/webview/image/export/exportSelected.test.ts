import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BufferItemData } from '@features/buffer';

import { StoreSliceId } from '../../store/definitions';
import type { AppStore } from '../../store/types';
import { exportSelected, resolveExportMessage } from './exportSelected';

/**
 * happy-dom has `OffscreenCanvas` but no 2D rendering behind it, so encoding is stubbed.
 * Everything upstream of the encoder — the chain, its halts, the bitmap's lifetime — is
 * what these tests are about.
 */
let encodeFails: boolean;

class FakeOffscreenCanvas {
  public getContext(): Pick<CanvasRenderingContext2D, 'drawImage'> {
    return { drawImage: () => undefined };
  }

  public async convertToBlob(): Promise<Pick<Blob, 'arrayBuffer'>> {
    if (encodeFails) {
      throw new Error('encoder exploded');
    }

    return { arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer };
  }
}

type World = { selected: string | null; item?: BufferItemData; decodable: boolean };

const item: BufferItemData = { id: 'a', name: 'frame.raw', data: new ArrayBuffer(8) };
const close = vi.fn();
const decode = vi.fn();

function storeFor(world: World): AppStore {
  decode.mockImplementation(async () => (world.decodable ? { width: 2, height: 2, close } : null));

  return {
    selectors: { selectedId: () => world.selected },
    get: (id: StoreSliceId) => (id === StoreSliceId.Sources
      ? { getItem: (lookup: string) => (world.item?.id === lookup ? world.item : undefined) }
      : { decode }),
  } as unknown as AppStore;
}

beforeEach(() => {
  encodeFails = false;
  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('resolveExportMessage: each step halts with its own message', () => {
  it.each([
    ['nothing selected', { selected: null, decodable: true }, 'warn', 'unable to detect selected image for export.'],
    ['a selection with no item', { selected: 'ghost', item, decodable: true }, 'warn', 'Raw Image Viewer: nothing to export.'],
    ['nothing decodable', { selected: 'a', item, decodable: false }, 'error', 'Raw Image Viewer: frame.raw has nothing decodable in it.'],
  ])('%s', async (_label, world, level, message) => {
    await expect(resolveExportMessage(storeFor(world as World)))
      .resolves.toEqual({ type: 'app:status', level, message });
  });

  it('stops at the first halt — nothing is decoded without a selection', async () => {
    await resolveExportMessage(storeFor({ selected: null, decodable: true }));

    expect(decode).not.toHaveBeenCalled();
  });
});

describe('resolveExportMessage: success', () => {
  it('resolves to the encoded PNG, named after the item', async () => {
    const message = await resolveExportMessage(storeFor({ selected: 'a', item, decodable: true }));

    expect(message).toMatchObject({ type: 'export:png', name: 'frame.raw.png' });
    expect(new Uint8Array((message as { data: ArrayBuffer }).data)[0]).toBe(0x89);
    expect(close).toHaveBeenCalledOnce();
  });
});

describe('resolveExportMessage: genuine failures', () => {
  it('propagates an encoder error instead of reporting it as "nothing to export"', async () => {
    encodeFails = true;

    await expect(resolveExportMessage(storeFor({ selected: 'a', item, decodable: true })))
      .rejects.toThrow('encoder exploded');
  });

  it('still closes the bitmap when encoding throws', async () => {
    encodeFails = true;

    await resolveExportMessage(storeFor({ selected: 'a', item, decodable: true })).catch(() => undefined);

    expect(close).toHaveBeenCalledOnce();
  });

  it('turns a throw in the very first step into a rejection, not a synchronous throw', () => {
    const exploding = {
      selectors: {
        selectedId: () => {
          throw new Error('selector blew up');
        },
      },
    } as unknown as AppStore;

    let pending: Promise<unknown> | undefined;

    expect(() => {
      pending = resolveExportMessage(exploding);
    }).not.toThrow();

    return expect(pending).rejects.toThrow('selector blew up');
  });
});

describe('exportSelected', () => {
  it.each([
    ['a halt', { selected: null, decodable: true }],
    ['a success', { selected: 'a', item, decodable: true }],
  ])('posts exactly once on %s', async (_label, world) => {
    const post = vi.fn();

    await exportSelected(storeFor(world as World), { postToWebviewHost: post } as never);

    expect(post).toHaveBeenCalledOnce();
  });

  it('reports a genuine failure to the user as an error status, and resolves rather than rejects', async () => {
    encodeFails = true;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const post = vi.fn();

    await expect(exportSelected(storeFor({ selected: 'a', item, decodable: true }), { postToWebviewHost: post } as never))
      .resolves.toBeUndefined();

    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith({
      type: 'app:status',
      level: 'error',
      message: 'Raw Image Viewer: export failed — encodePng: failed to convert canvas to PNG blob: Error: encoder exploded',
    });
  });

  it('logs that failure for the developer too — reported, not swallowed', async () => {
    encodeFails = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await exportSelected(storeFor({ selected: 'a', item, decodable: true }), { postToWebviewHost: vi.fn() } as never);

    expect(consoleError).toHaveBeenCalledWith('Raw Image Viewer: export failed', expect.any(Error));
  });
});
