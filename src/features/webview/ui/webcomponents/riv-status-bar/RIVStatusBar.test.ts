import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { PixelFormatPresets } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';
import { createWebviewStore } from '@features/webview/store/createWebviewStore';
import { StoreSliceId } from '@features/webview/store/definitions';
import type { ImageItem } from '@features/webview/store/slice/ImagesSlice';
import type { ProbeSample } from '@features/webview/store/slice/ProbeSlice';
import type { AppStore } from '@features/webview/store/types';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';

import { RIVStatusBar } from './index';

let store: AppStore;
let bar: RIVStatusBar;

beforeAll(() => {
  const formatRegistry = new FormatRegistry(PixelFormatPresets.PRESETS, DEFAULT_DECODE_OPTIONS.format.id);

  ({ store } = createWebviewStore());
  WebviewContextProvider.create({ store, formatRegistry });
  customElements.define(RIVStatusBar.tagName, RIVStatusBar);
});

beforeEach(() => {
  for (const id of store.get(StoreSliceId.Sources).ids) {
    store.get(StoreSliceId.Sources).remove(id);
  }

  store.get(StoreSliceId.Images).clear();
  // Back to single at 1:1: the view slice holds both, and both steer what the bar says.
  store.get(StoreSliceId.View).reset();
  store.get(StoreSliceId.DecodeOptions).setOptions({ ...DEFAULT_DECODE_OPTIONS, format: PixelFormatPresets.getPreset('rgba4444'), width: 4, height: 3 });

  bar = document.createElement(RIVStatusBar.tagName) as RIVStatusBar;
  document.body.replaceChildren(bar);
});

function segment(id: string): HTMLElement {
  const element = bar.shadowRoot?.querySelector<HTMLElement>(`[data-segment-id="${id}"]`);

  if (!element) {
    throw new Error(`riv-status-bar has no segment "${id}"`);
  }

  return element;
}

const geometry = (availableBytes: number): Geometry => ({
  width: 4,
  height: 3,
  frameCount: 1,
  bytesPerRow: 8,
  bytesPerFrame: 24,
  availableBytes,
  baseOffset: 0,
  lockedByHeader: false,
});

/** The source arrives first, then whatever the store made of it. */
function show(image: ImageItem): void {
  store.get(StoreSliceId.Sources).upsert([{ id: image.id, name: `${image.id}.raw`, uri: { path: '/a.raw' } as never }]);
  store.get(StoreSliceId.Images).put(image.id, image);
}

const decoded = (bytes: number): ImageItem => ({
  id: 'a',
  kind: 'ready',
  status: 'success',
  name: 'a.raw',
  detail: null,
  byteLength: bytes,
  geometry: geometry(bytes),
  image: { width: 2, height: 2, data: new Uint8ClampedArray(16) },
});

describe('riv-status-bar', () => {
  it('lays segments out start, spacer, end', () => {
    const children = [...(bar.shadowRoot?.getElementById('status-bar')?.children ?? [])] as HTMLElement[];

    expect(children.map((child) => child.dataset.segmentId ?? child.className)).toEqual(['summary', 'spacer', 'probe', 'pin', 'zoom', 'notes']);
  });

  it('follows the view: the zoom reading appears only while the image is magnified', () => {
    show(decoded(24));

    expect(segment('zoom').hidden).toBe(true);

    store.get(StoreSliceId.View).setZoom('in');

    expect(segment('zoom').hidden).toBe(false);
    expect(segment('zoom').textContent).toBe('200%');

    store.get(StoreSliceId.View).setZoom('reset');

    expect(segment('zoom').hidden).toBe(true);
  });

  it('follows the store: a decoded image fills the summary', () => {
    expect(segment('summary').hidden).toBe(true);

    show(decoded(24));

    expect(segment('summary').hidden).toBe(false);
    expect(segment('summary').textContent).toBe('4×3 · RGBA4444 · 8 B/row · 24 B');
  });

  it('follows the store: a changed format re-reads the summary', () => {
    show(decoded(24));
    store.get(StoreSliceId.DecodeOptions).setOptions({ format: PixelFormatPresets.getPreset('rgbx4444') });

    expect(segment('summary').textContent).toBe('4×3 · RGBX4444 · 8 B/row · 24 B');
  });

  it('marks a warning with its level', () => {
    show(decoded(10));

    expect(segment('notes').dataset.level).toBe('warn');
  });

  it('keeps the notes live region in the accessibility tree while it is empty', () => {
    // Hiding a live region would swallow the announcement when it next fills.
    show(decoded(24));

    expect(segment('notes').textContent).toBe('');
    expect(segment('notes').hidden).toBe(false);
    expect(segment('notes').getAttribute('role')).toBe('status');
  });

  it('does not announce the summary, which changes with every option', () => {
    expect(segment('summary').hasAttribute('role')).toBe(false);
  });
});

/**
 * happy-dom does not render pseudo-elements, so the lamp itself was checked in headless
 * Chrome. What is pinned here is what its CSS selector — `.indicator:not(:empty)` — relies on.
 *
 * `:empty` is spelled out by hand: happy-dom's own ignores text nodes, so a segment holding
 * a message still matches it. Chrome, like the spec, does not.
 */
describe('riv-status-bar: indicators', () => {
  const lit = (id: string) => segment(id).classList.contains('indicator') && segment(id).childNodes.length > 0;

  it('lights one on the notes only while they have something to say', () => {
    show(decoded(24));

    expect(lit('notes')).toBe(false);

    show(decoded(10));

    expect(lit('notes')).toBe(true);
  });

  it('spins on the segment that is waiting, until the bytes land', () => {
    show({ id: 'a', kind: 'pending' });

    expect(segment('summary').hasAttribute('data-loading')).toBe(true);

    show(decoded(24));

    expect(segment('summary').hasAttribute('data-loading')).toBe(false);
  });

  it('never lights one on the summary, which is a readout rather than a message', () => {
    show(decoded(24));

    expect(segment('summary').textContent).not.toBe('');
    expect(lit('summary')).toBe(false);
  });
});

describe('riv-status-bar: the probe chip', () => {
  const sample = (a: number): ProbeSample => ({
    id: 'a',
    position: { x: 1, y: 2 },
    rgba: { r: 255, g: 0, b: 170, a },
    location: { bits: 16, bitOffset: 0, byteOffset: 8 },
  });

  it('carries the colour as a custom property, and says it has one', () => {
    store.get(StoreSliceId.Probe).setActiveSample(sample(255));

    expect(segment('probe').hasAttribute('data-sample')).toBe(true);
    expect(segment('probe').style.getPropertyValue('--sample-color')).toBe('#ff00aaff');
  });

  it('takes the colour away with the reading, rather than leaving it behind', () => {
    store.get(StoreSliceId.Probe).setActiveSample(sample(255));
    store.get(StoreSliceId.Probe).clearActiveSample();

    expect(segment('probe').hasAttribute('data-sample')).toBe(false);
    expect(segment('probe').style.getPropertyValue('--sample-color')).toBe('');
  });

  it('shows no chip on a segment that names no colour', () => {
    store.get(StoreSliceId.View).setZoom('in');

    expect(segment('zoom').hasAttribute('data-sample')).toBe(false);
  });
});
