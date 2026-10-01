import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { Uri, window } from 'vscode';

import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';

import type { FileSource } from '../types';
import type { ItemOpener, WebviewHostMessage, WebviewMessage } from './types';
import { WebviewHost } from './WebviewHost';

let consoleError: MockInstance;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const source: FileSource = { id: 'a', name: 'frame.raw', uri: Uri.file('/frame.raw') as never };

function mount(
  postMessage: (message: WebviewHostMessage) => Promise<boolean>,
  itemOpener?: ItemOpener,
  sources: FileSource[] = [],
  sourcesDecoder: unknown = { decodeFromSource: async () => [] },
) {
  let receive: (message: WebviewMessage) => void = () => undefined;

  const webview = {
    options: {},
    html: '',
    cspSource: 'csp',
    asWebviewUri: () => ({ toString: () => 'main.js' }),
    onDidReceiveMessage: (listener: typeof receive) => {
      receive = listener;

      return { dispose: () => undefined };
    },
    postMessage,
  };

  const host = new WebviewHost(
    { extensionUri: Uri.file('/ext') } as never,
    webview as never,
    sources,
    'gallery' as never,
    { readDefaultDecodeOptions: () => DEFAULT_DECODE_OPTIONS } as never,
    sourcesDecoder as never,
    itemOpener,
  );

  return { host, receive: (message: WebviewMessage) => receive(message) };
}

describe('WebviewHost.post', () => {
  it('reports a message the webview dropped — it awaits the delivery, not the promise\'s truthiness', async () => {
    const { host } = mount(async () => false);
    const message: WebviewHostMessage = { type: 'sources:update', sources: [] };

    await host.post(message);

    expect(consoleError).toHaveBeenCalledWith('WebviewHost: Failed to post message to webview:', message);
  });
});

describe('WebviewHost: failures end handled', () => {
  const failure = new Error('gone');

  it('a failed open is caught where it happens', async () => {
    const { receive } = mount(async () => true, { openSingle: () => Promise.reject(failure) }, [source]);

    receive({ type: 'gallery:openItem', id: 'a' });

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith('Failed to handle open item:', failure));
  });

  it('tells the user when handling a message fails, rather than only the console', async () => {
    const { receive } = mount(() => Promise.reject(failure));

    expect(() => receive({ type: 'app:ready' })).not.toThrow();

    await vi.waitFor(() => expect(window.showErrorMessage)
      .toHaveBeenCalledWith('Failed to handle app ready: gone'));
  });
});

describe('WebviewHost: a first load needs no request', () => {
  it('decodes the sources it already holds and sends the images back', async () => {
    const posted = vi.fn();
    const decodeFromSource = vi.fn(async () => [{ status: 'failure', id: 'a', message: 'stubbed' }]);
    const { receive } = mount(
      async (message) => {
        posted(message.type);

        return true;
      },
      undefined,
      [source],
      { decodeFromSource },
    );

    receive({ type: 'app:ready' });

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith('images:decode:ready'));
    expect(decodeFromSource).toHaveBeenCalledWith([source], DEFAULT_DECODE_OPTIONS);
    expect(posted.mock.calls.map(([type]) => type))
      .toEqual(['session:start', 'sources:update', 'images:decode:ready']);
  });
});
