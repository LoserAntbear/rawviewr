import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormatRegistry } from '@SHARED/features/image/format/FormatRegistry';
import { PixelFormatPresets } from '@SHARED/features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@SHARED/features/image/imageDecoder/definitions';
import type { Geometry } from '@SHARED/features/image/imageDecoder/imagePreparation/types';
import type { DecodedFileSegment, DecodedFileStart } from '@SHARED/features/image/imageDecoder/types';
import { createWebviewStore } from '@WEBVIEW/features/store/createWebviewStore';
import { StoreSliceId } from '@WEBVIEW/features/store/definitions';
import type { AppStore } from '@WEBVIEW/features/store/types';
import { WebviewContextProvider } from '@WEBVIEW/features/webviewContext/WebviewContextProvider';

import { RIVImage } from './index';

/**
 * The whole streaming path, store to canvas: does a band arriving actually reach `putImageData`,
 * and does it reach it *as it arrives* rather than all at the end?
 *
 * This is the question a view test cannot answer — it calls `paint` directly, while the real
 * flow goes band -> slice -> `images:change` -> element render -> paint.
 */
const WIDTH = 4;
const HEIGHT = 8;
const ROWS_PER_BAND = 2;

let store: AppStore;
let element: RIVImage;
let putImageData: ReturnType<typeof vi.fn>;

const geometry: Geometry = {
  width: WIDTH,
  height: HEIGHT,
  frameCount: 1,
  bytesPerRow: WIDTH * 4,
  bytesPerFrame: WIDTH * HEIGHT * 4,
  availableBytes: WIDTH * HEIGHT * 4,
  baseOffset: 0,
  lockedByHeader: false,
};

const start: DecodedFileStart = {
  status: 'start',
  runId: 'run-1',
  id: 'a',
  name: 'a.raw',
  detail: null,
  byteLength: WIDTH * HEIGHT * 4,
  geometry,
};

const bandAt = (row: number): DecodedFileSegment => ({
  status: 'progress',
  runId: 'run-1',
  id: 'a',
  segment: {
    row,
    totalRows: ROWS_PER_BAND,
    data: new Uint8ClampedArray(WIDTH * ROWS_PER_BAND * 4).fill(row + 1),
  },
});

/**
 * Nothing needs settling any more, and that is the fix: `attemptDetached` runs its callback
 * synchronously inside the promise constructor, and the paint no longer awaits a bitmap, so a
 * band is on the canvas by the time `appendSegments` returns. Kept as a no-op await so the
 * tests still read as the asynchronous flow they model.
 */
const settle = () => Promise.resolve();

beforeAll(() => {
  ({ store } = createWebviewStore());
  WebviewContextProvider.create({
    store,
    formatRegistry: new FormatRegistry(PixelFormatPresets.PRESETS, DEFAULT_DECODE_OPTIONS.format.id),
  });

  if (!customElements.get(RIVImage.tagName)) {
    customElements.define(RIVImage.tagName, RIVImage);
  }
});

beforeEach(() => {
  putImageData = vi.fn();

  vi.stubGlobal('ImageData', class {
    constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ putImageData } as unknown as CanvasRenderingContext2D);

  store.get(StoreSliceId.Images).clear();
  store.get(StoreSliceId.DecodeOptions).setOptions({
    ...DEFAULT_DECODE_OPTIONS,
    format: PixelFormatPresets.getPreset('rgba8888'),
    width: WIDTH,
    height: HEIGHT,
  });

  element = document.createElement(RIVImage.tagName) as RIVImage;
  element.itemId = 'a';
  document.body.replaceChildren(element);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('riv-image: a decode arriving in bands', () => {
  const images = () => store.get(StoreSliceId.Images);

  it('shows the loading status while the facts are known but no pixels are', async () => {
    images().startDecode([start]);
    await settle();

    expect(putImageData).not.toHaveBeenCalled();
    expect(element.shadowRoot?.getElementById('status')?.hidden).toBe(false);
  });

  it('puts a band on the canvas synchronously, before the call even returns', () => {
    images().startDecode([start]);
    images().appendSegments([bandAt(0)]);

    // No awaiting: an async hop per band is what made the whole image appear in one jump.
    expect(putImageData).toHaveBeenCalledTimes(1);
  });

  it('draws a band as it arrives, not once they have all landed', async () => {
    images().startDecode([start]);
    await settle();

    const drawsAfter: number[] = [];

    for (let row = 0; row < HEIGHT; row += ROWS_PER_BAND) {
      images().appendSegments([bandAt(row)]);
      await settle();

      drawsAfter.push(putImageData.mock.calls.length);
    }

    // One more draw per band. All-at-the-end would read [0, 0, 0, 4].
    expect(drawsAfter).toEqual([1, 2, 3, 4]);
  });

  it('puts each band at its own row on the canvas', async () => {
    images().startDecode([start]);
    await settle();

    for (let row = 0; row < HEIGHT; row += ROWS_PER_BAND) {
      images().appendSegments([bandAt(row)]);
      await settle();
    }

    expect(putImageData.mock.calls.map(([, x, y]) => [x, y])).toEqual([[0, 0], [0, 2], [0, 4], [0, 6]]);
  });

  it('reveals the canvas on the first band rather than at the end', async () => {
    images().startDecode([start]);
    await settle();

    expect(element.shadowRoot?.getElementById('canvas')?.hidden).toBe(true);

    images().appendSegments([bandAt(0)]);
    await settle();

    expect(element.shadowRoot?.getElementById('canvas')?.hidden).toBe(false);
    expect(element.shadowRoot?.getElementById('status')?.hidden).toBe(true);
  });

  it('sizes the canvas from the geometry, before the last band', async () => {
    images().startDecode([start]);
    images().appendSegments([bandAt(0)]);
    await settle();

    const canvas = element.shadowRoot?.getElementById('canvas') as HTMLCanvasElement | null;

    expect([canvas?.width, canvas?.height]).toEqual([WIDTH, HEIGHT]);
  });

  it('does not redraw everything when the decode closes', async () => {
    images().startDecode([start]);

    for (let row = 0; row < HEIGHT; row += ROWS_PER_BAND) {
      images().appendSegments([bandAt(row)]);
    }

    await settle();

    const beforeClose = putImageData.mock.calls.length;

    images().finalizeDecode([{ status: 'success', runId: 'run-1', id: 'a' }]);
    await settle();

    // Closing carries no pixels, so it has nothing new to draw.
    expect(putImageData.mock.calls.length).toBe(beforeClose);
  });

  /**
   * The case the viewer actually hits with a big frame: bands land faster than the paints
   * resolve. Nothing may be dropped, and nothing may be drawn twice.
   */
  it('draws every band exactly once when they arrive faster than they paint', async () => {
    images().startDecode([start]);

    for (let row = 0; row < HEIGHT; row += ROWS_PER_BAND) {
      images().appendSegments([bandAt(row)]);
    }

    await settle();
    await settle();

    expect(putImageData.mock.calls.map(([, x, y]) => [x, y])).toEqual([[0, 0], [0, 2], [0, 4], [0, 6]]);
  });
});
