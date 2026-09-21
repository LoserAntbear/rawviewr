import { afterEach, describe, expect, it, vi } from 'vitest';

import { encodeBitmapToPng } from './encodePng';

const bitmap = { width: 2, height: 2 } as ImageBitmap;

function canvasWith(context: object | null, blob?: Pick<Blob, 'arrayBuffer'>): unknown {
  return class {
    public getContext(): object | null {
      return context;
    }

    public async convertToBlob(): Promise<Pick<Blob, 'arrayBuffer'> | undefined> {
      return blob;
    }
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('encodeBitmapToPng', () => {
  it('refuses a canvas with no 2D context', async () => {
    vi.stubGlobal('OffscreenCanvas', canvasWith(null));

    await expect(encodeBitmapToPng(bitmap)).rejects.toThrow('encodePng: could not get a 2d context');
  });

  it('gives a failed read of the blob the same descriptive rethrow as a failed conversion', async () => {
    vi.stubGlobal('OffscreenCanvas', canvasWith(
      { drawImage: () => undefined },
      { arrayBuffer: () => Promise.reject(new Error('read failed')) },
    ));

    await expect(encodeBitmapToPng(bitmap))
      .rejects.toThrow('encodePng: failed to convert canvas to PNG blob: Error: read failed');
  });
});
