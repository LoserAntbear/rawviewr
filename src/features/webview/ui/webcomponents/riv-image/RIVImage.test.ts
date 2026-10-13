import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { PixelFormatPresets } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';
import { createWebviewStore } from '@features/webview/store/createWebviewStore';
import { StoreSliceId } from '@features/webview/store/definitions';
import type { ImageItem } from '@features/webview/store/slice/ImagesSlice';
import type { AppStore } from '@features/webview/store/types';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';

import { RIVImage } from './index';

/**
 * The component mounted for real, to pin the one thing a handler test cannot: that the
 * pointer listeners sit on the canvas inside the shadow root. happy-dom has no 2D context
 * and lays nothing out, so the context and the box are both stubbed.
 */

let store: AppStore;
let element: RIVImage;

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

const ready: ImageItem = {
  id: 'a',
  kind: 'ready',
  status: 'success',
  name: 'a.raw',
  detail: null,
  byteLength: 24,
  geometry,
  image: { width: 4, height: 3, data: new Uint8ClampedArray(4 * 3 * 4).fill(7) },
};

function pointer(type: string, clientX = 2.5, clientY = 1.5): void {
  const canvas = element.shadowRoot?.getElementById('canvas');

  if (!canvas) {
    throw new Error('riv-image mounted without a canvas');
  }

  canvas.dispatchEvent(new PointerEvent(type, { clientX, clientY, bubbles: true }));
}

beforeAll(() => {
  ({ store } = createWebviewStore());
  WebviewContextProvider.create({
    store,
    formatRegistry: new FormatRegistry(PixelFormatPresets.PRESETS, DEFAULT_DECODE_OPTIONS.format.id),
  });
  customElements.define(RIVImage.tagName, RIVImage);
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close: () => undefined })));
  vi.stubGlobal('ImageData', class {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ drawImage: () => undefined } as unknown as CanvasRenderingContext2D);
  // happy-dom has no Typed OM; the zoom is read through it.
  Object.defineProperty(HTMLCanvasElement.prototype, 'computedStyleMap', {
    configurable: true,
    writable: true,
    value: () => ({ get: () => ({ toString: () => '1' }) }),
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect')
    .mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 4, height: 3 } as DOMRect);

  store.get(StoreSliceId.Images).clear();
  store.get(StoreSliceId.Probe).reset();
  store.get(StoreSliceId.DecodeOptions).setOptions({
    ...DEFAULT_DECODE_OPTIONS,
    format: PixelFormatPresets.getPreset('rgba4444'),
    width: 4,
    height: 3,
  });
  store.get(StoreSliceId.Images).put('a', ready);

  element = document.createElement(RIVImage.tagName) as RIVImage;
  element.itemId = 'a';
  document.body.replaceChildren(element);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const activeSample = () => store.get(StoreSliceId.Probe).activeSample;

describe('riv-image: the pixel probe', () => {
  it('reads a pointer over its canvas, through the shadow boundary', () => {
    pointer('pointermove');

    expect(activeSample()).toMatchObject({ id: 'a', position: { x: 2, y: 1 } });
  });

  it('clears the reading when the pointer leaves the canvas', () => {
    pointer('pointermove');
    pointer('pointerleave');

    expect(activeSample()).toBeNull();
  });

  it('pins the pixel that was clicked on its canvas', () => {
    pointer('click');

    expect(store.get(StoreSliceId.Probe).pinnedSample).toMatchObject({ id: 'a', position: { x: 2, y: 1 } });
  });

  it('stops reading once it is off the page', () => {
    element.remove();

    pointer('pointermove');

    expect(activeSample()).toBeNull();
  });
});
