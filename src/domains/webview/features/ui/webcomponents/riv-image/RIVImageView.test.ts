import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SegmentedImage } from '@SHARED/features/image/imageDecoder/segments';

import { RIVImageView } from './RIVImageView';

/**
 * Bands are *put* onto the canvas, synchronously, which is the point: a band has to land in the
 * same task it arrived in. Going through `createImageBitmap` made every draw queue behind an
 * async hop, they outran the arrivals, and the image appeared in one jump at the end.
 *
 * happy-dom has no 2D context, so the context is stubbed; what is pinned is where each band
 * lands, that only new bands are put, and that the canvas is sized only once per run — because
 * assigning `canvas.width` *clears* it, so sizing per band would wipe every band before it.
 */

/** Bands of two rows each, as the decoder emits them. */
function image(width = 2, height = 2, bandCount = 1): SegmentedImage {
  const rowsPerBand = height / bandCount;

  return {
    width,
    height,
    segments: Array.from({ length: bandCount }, (_unused, index) => ({
      row: index * rowsPerBand,
      totalRows: rowsPerBand,
      data: new Uint8ClampedArray(width * rowsPerBand * 4),
    })),
  };
}

let putImageData: ReturnType<typeof vi.fn>;
let view: RIVImageView;
let widthAssignments: number[];

beforeEach(() => {
  putImageData = vi.fn();
  widthAssignments = [];

  const root = document.createElement('div').attachShadow({ mode: 'open' });

  root.innerHTML = '<canvas id="canvas"></canvas><div id="status"></div>';

  const canvas = root.getElementById('canvas') as HTMLCanvasElement;

  vi.spyOn(canvas, 'getContext').mockReturnValue({ putImageData } as unknown as CanvasRenderingContext2D);

  // Every assignment is recorded, which is how "sized once per run" becomes observable.
  let width = 0;

  Object.defineProperty(canvas, 'width', {
    configurable: true,
    get: () => width,
    set: (next: number) => {
      width = next;
      widthAssignments.push(next);
    },
  });

  vi.stubGlobal('ImageData', class {
    constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
  });

  view = new RIVImageView(root);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RIVImageView.paint', () => {
  it('puts the band at its own row, as image data rather than a bitmap', () => {
    view.paint(image(), 'run-1');

    const [data, x, y] = putImageData.mock.calls[0] ?? [];

    expect([x, y]).toEqual([0, 0]);
    // Sized to the band, not the image: a band is its own rows wide and tall.
    expect([data?.width, data?.height]).toEqual([2, 2]);
  });

  it('sizes the canvas to the image', () => {
    view.paint(image(8, 4), 'run-1');

    const canvas = view.ref<HTMLCanvasElement>('canvas');

    expect([canvas?.width, canvas?.height]).toEqual([8, 4]);
  });

  it('places each band at its own offset rather than at the origin', () => {
    view.paint(image(2, 4, 2), 'run-1');

    expect(putImageData.mock.calls.map(([, x, y]) => [x, y])).toEqual([[0, 0], [0, 2]]);
  });

  it('draws only the bands it has not drawn yet', () => {
    const streaming = image(2, 4, 2);
    const firstBandOnly = { ...streaming, segments: streaming.segments.slice(0, 1) };

    view.paint(firstBandOnly, 'run-1');
    view.paint(streaming, 'run-1');

    // Two bands arrived across two calls, so two draws — not three.
    expect(putImageData).toHaveBeenCalledTimes(2);
    expect(putImageData.mock.calls.map(([, x, y]) => [x, y])).toEqual([[0, 0], [0, 2]]);
  });

  it('sizes the canvas once for a run, however many bands arrive', () => {
    const streaming = image(2, 4, 2);

    view.paint({ ...streaming, segments: streaming.segments.slice(0, 1) }, 'run-1');
    view.paint(streaming, 'run-1');

    // A second assignment here would have cleared the first band off the canvas.
    expect(widthAssignments).toEqual([2]);
  });

  it('sizes again for a different run, because that is a different image', () => {
    view.paint(image(2, 2), 'run-1');
    view.paint(image(8, 4), 'run-2');

    expect(widthAssignments).toEqual([2, 8]);
  });

  /**
   * Hiding zeroes the canvas dimensions to release the backing store, which also destroys the
   * pixels. Anything the view remembers about what it has drawn has to go with them.
   */
  it('redraws from the first band after the canvas has been offloaded', () => {
    const streaming = image(2, 4, 2);

    view.paint(streaming, 'run-1');
    expect(putImageData).toHaveBeenCalledTimes(2);

    view.handleCanvasVisibility(false);
    view.paint(streaming, 'run-1');

    expect(putImageData).toHaveBeenCalledTimes(4);
  });
});
