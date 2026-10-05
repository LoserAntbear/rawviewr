import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { PixelFormatPresets } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';
import { createWebviewStore } from '@webview/store/createWebviewStore';
import { StoreSliceId } from '@webview/store/definitions';
import type { ImageItem } from '@webview/store/slice/ImagesSlice';
import type { AppStore } from '@webview/store/types';
import { WebviewContextProvider } from '@webview/webviewContext/WebviewContextProvider';

import { ProbeInputHandler } from './ProbeInputHandler';

/**
 * The pointer end of the probe. happy-dom lays nothing out, so the canvas box is stubbed —
 * the arithmetic over it is covered in `utils.test.ts` and against real layout in Chrome.
 */

let store: AppStore;
let canvas: HTMLCanvasElement;
let handler: ProbeInputHandler;

const geometry: Geometry = {
  width: 4,
  height: 3,
  frameCount: 1,
  bytesPerRow: 8,
  bytesPerFrame: 24,
  availableBytes: 24,
  baseOffset: 0,
  lockedByHeader: false,
};

function ready(id = 'a'): ImageItem {
  const data = new Uint8ClampedArray(4 * 3 * 4);

  data.set([10, 20, 30, 255], (1 * 4 + 2) * 4);

  return {
    id,
    kind: 'ready',
    status: 'success',
    name: `${id}.raw`,
    detail: null,
    byteLength: 24,
    geometry,
    image: { width: 4, height: 3, data },
  };
}

/**
 * happy-dom has no Typed OM, and `computedStyleMap` is how the effective zoom is read.
 * Defined on the prototype, as the real API is, so the code under test finds it the usual
 * way rather than on an instance it was handed.
 */
function stubZoom(zoom: number): void {
  Object.defineProperty(HTMLCanvasElement.prototype, 'computedStyleMap', {
    configurable: true,
    writable: true,
    value: () => ({ get: () => ({ toString: () => String(zoom) }) }),
  });
}

/** A pointer over the centre of image pixel (2,1), with the canvas at its intrinsic size. */
function move(x = 2.5, y = 1.5): void {
  const event = new PointerEvent('pointermove', { clientX: x, clientY: y });

  Object.defineProperty(event, 'target', { value: canvas });
  handler.handlePointerMove(event);
}

beforeAll(() => {
  ({ store } = createWebviewStore());
  WebviewContextProvider.create({
    store,
    formatRegistry: new FormatRegistry(PixelFormatPresets.PRESETS, DEFAULT_DECODE_OPTIONS.format.id),
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  store.get(StoreSliceId.Images).clear();
  store.get(StoreSliceId.Probe).reset();
  store.get(StoreSliceId.DecodeOptions).setOptions({
    ...DEFAULT_DECODE_OPTIONS,
    format: PixelFormatPresets.getPreset('rgba4444'),
    width: 4,
    height: 3,
  });

  stubZoom(1);
  canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 3;
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 4, height: 3 } as DOMRect);

  handler = new ProbeInputHandler({ itemId: 'a' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const activeSample = () => store.get(StoreSliceId.Probe).activeSample;

describe('ProbeInputHandler', () => {
  it('reads the pixel under the pointer into the store', () => {
    store.get(StoreSliceId.Images).put('a', ready());

    move();

    expect(activeSample()).toMatchObject({
      id: 'a',
      position: { x: 2, y: 1 },
      rgba: { r: 10, g: 20, b: 30, a: 255 },
      location: { byteOffset: 12 },
    });
  });

  it('reports nothing while the image is still decoding', () => {
    store.get(StoreSliceId.Images).put('a', { id: 'a', kind: 'pending' });

    move();

    expect(activeSample()).toBeNull();
  });

  it('reports nothing for an item the store has never heard of', () => {
    move();

    expect(activeSample()).toBeNull();
  });

  it('clears the reading when the pointer leaves', () => {
    store.get(StoreSliceId.Images).put('a', ready());

    move();
    handler.handlePointerLeave();

    expect(activeSample()).toBeNull();
  });

  it('holds the reading to one a frame, and takes the next after it', () => {
    store.get(StoreSliceId.Images).put('a', ready());

    move(2.5, 1.5);
    move(0.5, 0.5);

    expect(activeSample()?.position).toEqual({ x: 2, y: 1 });

    vi.advanceTimersByTime(16);
    move(0.5, 0.5);

    expect(activeSample()?.position).toEqual({ x: 0, y: 0 });
  });

  it('divides out the zoom, which the rect comes back without', () => {
    store.get(StoreSliceId.Images).put('a', ready());
    stubZoom(4);

    // The canvas paints 4x, so pixel (2,1) sits four times further from the origin.
    move(10, 6);

    expect(activeSample()?.position).toEqual({ x: 2, y: 1 });
  });

  it('ignores a move that did not come from a canvas', () => {
    store.get(StoreSliceId.Images).put('a', ready());

    const event = new PointerEvent('pointermove', { clientX: 2, clientY: 1 });

    Object.defineProperty(event, 'target', { value: document.createElement('div') });
    handler.handlePointerMove(event);

    expect(activeSample()).toBeNull();
  });
});
