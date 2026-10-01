import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImageItem } from '../../store/slice/ImagesSlice';
import type { AppStore } from '../../store/types';
import { exportSelected, resolveExportMessage } from './exportSelected';

/**
 * happy-dom has `OffscreenCanvas` but no 2D rendering behind it, so encoding is stubbed.
 * Everything upstream of the encoder — the chain and its halts — is what these are about.
 */
let encodeFails: boolean;

class FakeOffscreenCanvas {
  public getContext(): Pick<CanvasRenderingContext2D, 'putImageData'> {
    return { putImageData: () => undefined };
  }

  public async convertToBlob(): Promise<Pick<Blob, 'arrayBuffer'>> {
    if (encodeFails) {
      throw new Error('encoder exploded');
    }

    return { arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer };
  }
}

const ready = (): ImageItem => ({
  id: 'a',
  kind: 'ready',
  status: 'success',
  name: 'frame.raw',
  detail: null,
  byteLength: 24,
  geometry: { width: 2, height: 2 } as never,
  image: { width: 2, height: 2, data: new Uint8ClampedArray(16) },
});

/** The export reads one thing: the image the store decoded for the id on screen. */
function storeFor(selected: string | null, image?: ImageItem, visible: string[] = []): AppStore {
  return {
    selectors: { selectedId: () => selected, visibleIds: () => visible },
    get: () => ({ getImage: (id: string) => (image?.id === id ? image : undefined) }),
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
    ['nothing selected', storeFor(null), 'warn', 'unable to detect selected image for export.'],
    ['a selection with no image', storeFor('ghost', ready()), 'warn', 'Raw Image Viewer: nothing to export.'],
    [
      'an image still decoding',
      storeFor('a', { id: 'a', kind: 'pending' }),
      'warn',
      'Raw Image Viewer: image is not ready for export.',
    ],
    [
      'an image that failed to decode',
      storeFor('a', { id: 'a', kind: 'failed', message: 'bad header' }),
      'warn',
      'Raw Image Viewer: image is not ready for export.',
    ],
  ])('%s', async (_label, store, level, message) => {
    await expect(resolveExportMessage(store)).resolves.toEqual({ type: 'app:status', level, message });
  });
});

describe('resolveExportMessage: success', () => {
  it('resolves to the encoded PNG, named after the image', async () => {
    const message = await resolveExportMessage(storeFor('a', ready()));

    expect(message).toMatchObject({ type: 'export:png', name: 'frame.raw.png' });
    expect(new Uint8Array((message as { data: ArrayBuffer }).data)[0]).toBe(0x89);
  });
});

describe('resolveExportMessage: genuine failures', () => {
  it('propagates an encoder error instead of reporting it as "nothing to export"', async () => {
    encodeFails = true;

    await expect(resolveExportMessage(storeFor('a', ready()))).rejects.toThrow('encoder exploded');
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
    ['a halt', storeFor(null)],
    ['a success', storeFor('a', ready())],
  ])('posts exactly once on %s', async (_label, store) => {
    const post = vi.fn();

    await exportSelected(store, { postToWebviewHost: post } as never);

    expect(post).toHaveBeenCalledOnce();
  });

  it('exports what is on screen when nothing was ever picked, as in single mode', async () => {
    const post = vi.fn();

    await exportSelected(storeFor(null, ready(), ['a']), { postToWebviewHost: post } as never);

    expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: 'export:png', name: 'frame.raw.png' }));
  });

  it('reports a genuine failure to the user as an error status, and resolves rather than rejects', async () => {
    encodeFails = true;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const post = vi.fn();

    await expect(exportSelected(storeFor('a', ready()), { postToWebviewHost: post } as never))
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

    await exportSelected(storeFor('a', ready()), { postToWebviewHost: vi.fn() } as never);

    expect(consoleError).toHaveBeenCalledWith('Raw Image Viewer: export failed', expect.any(Error));
  });
});
