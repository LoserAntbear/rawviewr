import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DecodedImage } from '@features/image/imageDecoder/types';

import { RIVImageView } from './RIVImageView';

/**
 * The bitmap is made here, where the canvas is, and closed as soon as it is drawn — the
 * canvas keeps its own copy. happy-dom has no 2D context and no `createImageBitmap`, so
 * both are stubbed; what is pinned is the lifetime and which paint wins.
 */

type FakeBitmap = ImageBitmap & { close: ReturnType<typeof vi.fn> };

const bitmap = (): FakeBitmap => ({ width: 2, height: 2, close: vi.fn() } as unknown as FakeBitmap);

const image = (width = 2, height = 2): DecodedImage => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
});

/** A bitmap the test hands over when it chooses, so two paints can overlap. */
function heldBitmap() {
  let hand = (_bitmap: FakeBitmap): void => undefined;
  const promise = new Promise<FakeBitmap>((resolve) => {
    hand = resolve;
  });

  return { promise, hand };
}

let drawImage: ReturnType<typeof vi.fn>;
let view: RIVImageView;

beforeEach(() => {
  drawImage = vi.fn();

  const root = document.createElement('div').attachShadow({ mode: 'open' });

  root.innerHTML = '<canvas id="canvas"></canvas><div id="status"></div>';
  vi.spyOn(root.getElementById('canvas') as HTMLCanvasElement, 'getContext')
    .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);

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
  it('draws the pixels it was given, and closes the bitmap it made', async () => {
    const painted = bitmap();

    vi.stubGlobal('createImageBitmap', vi.fn(async () => painted));

    await view.paint(image());

    expect(drawImage).toHaveBeenCalledWith(painted, 0, 0);
    expect(painted.close).toHaveBeenCalledOnce();
  });

  it('sizes the canvas to the image', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap()));

    await view.paint(image(8, 4));

    const canvas = view.ref<HTMLCanvasElement>('canvas');

    expect([canvas?.width, canvas?.height]).toEqual([8, 4]);
  });

  it('lets the newer paint win when a slower one lands late, and closes the stale bitmap', async () => {
    const slow = heldBitmap();
    const stale = bitmap();
    const current = bitmap();

    vi.stubGlobal('createImageBitmap', vi.fn()
      .mockImplementationOnce(() => slow.promise)
      .mockImplementationOnce(async () => current));

    const first = view.paint(image());
    const second = view.paint(image());

    await second;
    slow.hand(stale);
    await first;

    expect(drawImage).toHaveBeenCalledOnce();
    expect(drawImage).toHaveBeenCalledWith(current, 0, 0);
    expect(stale.close).toHaveBeenCalledOnce();
  });
});
