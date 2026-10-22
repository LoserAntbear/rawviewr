import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { PixelFormatPresets } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { createWebviewStore } from '@features/webview/store/createWebviewStore';
import { StoreSliceId } from '@features/webview/store/definitions';
import type { AppStore } from '@features/webview/store/types';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';

import {
  type FakeIntersectionObserver,
  installFakeIntersectionObserver,
} from '../../../../../test/mocks/intersectionObserver';
import type { FileSource } from '../../../types';

import { RIVGallery } from './index';

/**
 * What the gallery does with the observer, rather than what the observer does — that part is
 * the browser's, and happy-dom's stub never calls back, so the passes are driven by hand.
 */
let store: AppStore;
let gallery: RIVGallery;
let instances: FakeIntersectionObserver[];

const source = (id: string): FileSource => ({ id, name: `${id}.raw`, uri: { path: `/${id}.raw` } as never });

beforeAll(() => {
  const formatRegistry = new FormatRegistry(PixelFormatPresets.PRESETS, DEFAULT_DECODE_OPTIONS.format.id);

  ({ store } = createWebviewStore());
  WebviewContextProvider.create({ store, formatRegistry });
  customElements.define(RIVGallery.tagName, RIVGallery);
});

beforeEach(() => {
  ({ instances } = installFakeIntersectionObserver());

  store.get(StoreSliceId.Images).clear();
  store.get(StoreSliceId.View).reset();
  store.get(StoreSliceId.View).setMode('gallery');
  store.get(StoreSliceId.VirtualList).reset();
  store.get(StoreSliceId.Sources).upsert([source('a'), source('b'), source('c')]);

  gallery = document.createElement(RIVGallery.tagName) as RIVGallery;
  document.body.replaceChildren(gallery);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

const observer = (): FakeIntersectionObserver => {
  const [first] = instances;

  if (!first) {
    throw new Error('the gallery built no observer');
  }

  return first;
};

const entryFor = (id: string): Element => {
  const entry = gallery.shadowRoot?.querySelector(`li[data-item-id="${id}"]`);

  if (!entry) {
    throw new Error(`no entry for "${id}"`);
  }

  return entry;
};

const onScreen = () => [...store.get(StoreSliceId.VirtualList).ids];

describe('riv-gallery: the observed window', () => {
  it('roots the observer at itself, which is the element that scrolls', () => {
    expect(observer().root).toBe(gallery);
  });

  /**
   * The values are tunable, their intent is not: any pixel counts, the root reaches past the
   * viewport so tiles are decoded before they arrive, and a tile cannot report continuously.
   */
  it('lets a single pixel count, and reaches beyond the viewport', () => {
    const { threshold, rootMargin, delay } = observer().options;
    const [vertical] = rootMargin?.split(' ') ?? [];

    expect(threshold).toBe(0);
    expect(Number.parseInt(vertical ?? '0', 10)).toBeGreaterThan(0);
    expect(delay).toBeGreaterThan(0);
  });

  it('watches every tile it built', () => {
    expect(observer().targets).toHaveLength(3);
  });

  /**
   * The first pass reports every target, intersecting or not — which is exactly the initial
   * window, so there is no startup case to special-case. Taking the whole batch instead of the
   * intersecting part of it would ask for every file in the gallery.
   */
  it('seeds the window from the first pass, keeping only what intersects', () => {
    observer().reportFirstPass([entryFor('a'), entryFor('b')]);

    expect(onScreen()).toEqual(['a', 'b']);
  });

  /**
   * Entries are deltas: a pass names only the tiles whose state changed. Rebuilding the set
   * from one callback would drop everything the pass stayed silent about.
   */
  it('accumulates across passes rather than replacing what it knows', () => {
    observer().reportFirstPass([entryFor('a')]);
    observer().report([[entryFor('b'), true]]);

    expect(onScreen()).toEqual(['a', 'b']);
  });

  it('lets go of a tile that has left', () => {
    observer().reportFirstPass([entryFor('a'), entryFor('b')]);
    observer().report([[entryFor('a'), false]]);

    expect(onScreen()).toEqual(['b']);
  });

  it('asks the host only for what came into view', () => {
    const asked = vi.fn();

    store.bus.on('images:decode:requested', (event) => asked(event.detail));
    observer().reportFirstPass([entryFor('b')]);

    expect(asked).toHaveBeenCalledWith({ ids: ['b'] });
  });

  it('does not re-watch a tile when something else re-renders', () => {
    store.get(StoreSliceId.Config).setConfiguration({ tileSize: 320 });

    expect(observer().targets).toHaveLength(3);
  });

  it('watches a tile that arrives later', () => {
    store.get(StoreSliceId.Sources).upsert([source('d')]);

    expect(observer().targets).toHaveLength(4);
  });

  it('stops observing once it leaves the document', () => {
    document.body.replaceChildren();

    expect(observer().disconnected).toBe(true);
  });
});
