import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { commands, Uri, window, workspace } from 'vscode';
import { Endian } from '@definitions/bits';

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

describe('WebviewHost.requestZoom', () => {
  it('carries the direction to its own webview and nothing else', async () => {
    const postMessage = vi.fn(async () => true);
    const { host } = mount(postMessage);

    await host.requestZoom('out');

    // The host decides nothing about where the zoom lands: that is the view's state.
    expect(postMessage).toHaveBeenCalledWith({ type: 'view:zoom', direction: 'out' });
  });
});

/**
 * VS Code resolves a keybinding outside the frame and cannot see what has focus inside it,
 * so the webview says, and the host turns that into the context key the `when` clauses read.
 */
describe('WebviewHost: the field-focus context', () => {
  it.each([true, false])('passes on what the webview reported: %s', async (focused) => {
    const { receive } = mount(async () => true);

    receive({ type: 'view:fieldFocus', focused });

    await vi.waitFor(() => expect(commands.executeCommand)
      .toHaveBeenCalledWith('setContext', 'rawImageViewer.fieldFocus', focused));
  });

  it('releases the key when the view goes away, since the key is global', async () => {
    const { host, receive } = mount(async () => true);

    receive({ type: 'view:fieldFocus', focused: true });
    await vi.waitFor(() => expect(commands.executeCommand).toHaveBeenCalledTimes(1));

    host.dispose();

    // Otherwise a disposed view would hold the zoom keys hostage in the next one.
    await vi.waitFor(() => expect(commands.executeCommand)
      .toHaveBeenLastCalledWith('setContext', 'rawImageViewer.fieldFocus', false));
  });
});

/**
 * The half of a reading the webview cannot take. It keeps no buffers — that is what makes a
 * gallery of thousands affordable — so a pinned offset is read here, from the file.
 */
describe('WebviewHost: the probe read', () => {
  const location = { bits: 16, bitOffset: 0, byteOffset: 2 } as const;

  it('reads the bytes that offset points at and sends them back', async () => {
    const posted = vi.fn();

    // 0x1f3c sits at byte 2, little endian.
    vi.mocked(workspace.fs.readFile).mockResolvedValue(new Uint8Array([0, 0, 0x3c, 0x1f, 0]));

    const { receive } = mount(async (message) => {
      posted(message);

      return true;
    }, undefined, [source]);

    receive({ type: 'probe:request', id: 'a', location, endian: Endian.Little });

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith({
      location,
      id: 'a',
      type: 'probe:receive:source-bytes',
      result: { kind: 'received', bytes: { bytes: [0x3c, 0x1f], value: 0x1f3c } },
    }));
  });

  it('reads the same bytes the other way round when the options say so', async () => {
    const posted = vi.fn();

    vi.mocked(workspace.fs.readFile).mockResolvedValue(new Uint8Array([0, 0, 0x3c, 0x1f, 0]));

    const { receive } = mount(async (message) => {
      posted(message);

      return true;
    }, undefined, [source]);

    receive({ type: 'probe:request', id: 'a', location, endian: Endian.Big });

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith(expect.objectContaining({
      result: { kind: 'received', bytes: { bytes: [0x3c, 0x1f], value: 0x3c1f } },
    })));
  });

  it('says nothing for a source it does not hold, rather than failing the view', async () => {
    const posted = vi.fn();
    const { receive } = mount(async (message) => {
      posted(message);

      return true;
    }, undefined, [source]);

    receive({ type: 'probe:request', id: 'gone', location, endian: Endian.Little });

    await vi.waitFor(() => expect(workspace.fs.readFile).not.toHaveBeenCalled());
    expect(posted).not.toHaveBeenCalled();
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

describe('WebviewHost: a probe read that fails', () => {
  const location = { bits: 16, bitOffset: 0, byteOffset: 2 } as const;

  it('answers with the failure instead of leaving the view waiting', async () => {
    const posted = vi.fn();

    vi.mocked(workspace.fs.readFile).mockRejectedValue(new Error('EACCES'));

    const { receive } = mount(async (message) => {
      posted(message);

      return true;
    }, undefined, [source]);

    receive({ type: 'probe:request', id: 'a', location, endian: Endian.Little });

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith(expect.objectContaining({
      type: 'probe:receive:source-bytes',
      result: { kind: 'failed', message: expect.stringContaining('EACCES') },
    })));
  });

  it('keeps the failure to the reading, rather than raising it to the user', async () => {
    vi.mocked(workspace.fs.readFile).mockRejectedValue(new Error('EACCES'));

    const { receive } = mount(async () => true, undefined, [source]);

    receive({ type: 'probe:request', id: 'a', location, endian: Endian.Little });

    // A pixel that could not be read is the bar's business, not a message box's.
    await vi.waitFor(() => expect(window.showErrorMessage).not.toHaveBeenCalled());
  });
});
