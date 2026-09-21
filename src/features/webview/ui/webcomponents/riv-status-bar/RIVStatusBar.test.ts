import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { createWebviewStore } from '@features/webview/store/createWebviewStore';
import { StoreSliceId } from '@features/webview/store/definitions';
import type { AppStore } from '@features/webview/store/types';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';

import { RIVStatusBar } from './index';

let store: AppStore;
let bar: RIVStatusBar;

beforeAll(() => {
  const formatRegistry = new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format);

  ({ store } = createWebviewStore(formatRegistry));
  WebviewContextProvider.create({ store, formatRegistry });
  customElements.define(RIVStatusBar.tagName, RIVStatusBar);
});

beforeEach(() => {
  for (const id of store.get(StoreSliceId.Items).ids) {
    store.get(StoreSliceId.Items).remove(id);
  }

  store.get(StoreSliceId.View).setMode('single');
  store.get(StoreSliceId.Decode).setOptions({ ...DEFAULT_DECODE_OPTIONS, format: 'rgba4444', width: 4, height: 3 });

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

const addBuffer = (bytes: number) => store.get(StoreSliceId.Items).upsert([
  { id: 'a', name: 'a.raw', data: new ArrayBuffer(bytes) },
]);

describe('riv-status-bar', () => {
  it('lays segments out start, spacer, end', () => {
    const children = [...(bar.shadowRoot?.getElementById('status-bar')?.children ?? [])] as HTMLElement[];

    expect(children.map((child) => child.dataset.segmentId ?? child.className)).toEqual(['summary', 'spacer', 'notes']);
  });

  it('follows the store: a buffer arriving fills the summary', () => {
    expect(segment('summary').hidden).toBe(true);

    addBuffer(24);

    expect(segment('summary').hidden).toBe(false);
    expect(segment('summary').textContent).toBe('4×3 · RGBA4444 · 8 B/row · 24 B');
  });

  it('follows the store: changing an option re-resolves the geometry', () => {
    addBuffer(24);
    store.get(StoreSliceId.Decode).setOptions({ width: 2, height: 6 });

    expect(segment('summary').textContent).toBe('2×6 · RGBA4444 · 4 B/row · 24 B');
  });

  it('marks a warning with its level', () => {
    addBuffer(10);

    expect(segment('notes').dataset.level).toBe('warn');
  });

  it('keeps the notes live region in the accessibility tree while it is empty', () => {
    // Hiding a live region would swallow the announcement when it next fills.
    addBuffer(24);

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
 * Chrome. What is pinned here is what its CSS selector — `.telltale:not(:empty)` — relies on.
 *
 * `:empty` is spelled out by hand: happy-dom's own ignores text nodes, so a segment holding
 * a message still matches it. Chrome, like the spec, does not.
 */
describe('riv-status-bar: telltales', () => {
  const lit = (id: string) => segment(id).classList.contains('telltale') && segment(id).childNodes.length > 0;

  it('lights one on the notes only while they have something to say', () => {
    addBuffer(24);

    expect(lit('notes')).toBe(false);

    addBuffer(10);

    expect(lit('notes')).toBe(true);
  });

  it('never lights one on the summary, which is a readout rather than a message', () => {
    addBuffer(24);

    expect(segment('summary').textContent).not.toBe('');
    expect(lit('summary')).toBe(false);
  });
});
