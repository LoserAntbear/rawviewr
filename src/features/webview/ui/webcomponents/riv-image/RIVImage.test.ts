import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { createWebviewStore } from '@features/webview/store/createWebviewStore';
import { StoreSliceId } from '@features/webview/store/definitions';
import type { AppStore } from '@features/webview/store/types';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';

import { RIVImage } from './index';

let store: AppStore;

beforeAll(() => {
  const formatRegistry = new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format);
  ({ store } = createWebviewStore(formatRegistry));

  WebviewContextProvider.create({ store, formatRegistry });
  customElements.define(RIVImage.tagName, RIVImage);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('riv-image: render', () => {
  it('a throw outside the render\'s own try is caught at the listener edge, not left unhandled', async () => {
    const failure = new Error('lookup blew up');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(store.get(StoreSliceId.Items), 'getItem').mockImplementation(() => {
      throw failure;
    });

    const image = document.createElement(RIVImage.tagName) as RIVImage;
    image.itemId = 'a';
    document.body.replaceChildren(image);

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(`${RIVImage.tagName}: render failed`, failure));
  });
});
