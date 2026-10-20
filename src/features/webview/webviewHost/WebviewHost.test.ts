import { commands, Uri, window, workspace } from 'vscode';

import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { Endian } from '@definitions/bits';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { type ToolbarOptionsSnapshot, toPreservedOptions } from '@features/settings/snapshot';
import type { ViewerConfiguration } from '@features/settings/VSCodeWorkspaceConfig/types';
import { DEFAULT_VIEWER_CONFIGURATION, ViewerBackground } from '@features/viewer/definitions';

import type { FileSource } from '../types';

import type { ItemOpener, WebviewHostMessage, WebviewMessage } from './types';
import { WebviewHost } from './WebviewHost';

let consoleError: MockInstance;

/** Set by `mount`, so a test can push a settings change the way the controller would. */
let pushViewerConfiguration: ((config: ViewerConfiguration) => void) | undefined;
let pushToolbarSnapshot: ((snapshot: ToolbarOptionsSnapshot) => void) | undefined;
let storedSnapshot: ToolbarOptionsSnapshot | null;
let writtenSnapshots: ToolbarOptionsSnapshot[];

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  storedSnapshot = null;
  writtenSnapshots = [];
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
    {
      readDefaultDecodeOptions: () => DEFAULT_DECODE_OPTIONS,
      readSessionDecodeOptions: () => DEFAULT_DECODE_OPTIONS,
      get toolbarSnapshot() {
        return storedSnapshot;
      },
      writeToolbarSnapshot: (snapshot: ToolbarOptionsSnapshot) => {
        writtenSnapshots.push(snapshot);

        return Promise.resolve();
      },
      onToolbarSnapshotChange: (listen: (snapshot: ToolbarOptionsSnapshot) => void) => {
        pushToolbarSnapshot = listen;

        return { dispose: () => (pushToolbarSnapshot = undefined) };
      },
      readViewerConfiguration: () => DEFAULT_VIEWER_CONFIGURATION,
      readDefaultBackground: () => ViewerBackground.checker,
      onViewerConfigurationChange: (listen: (config: ViewerConfiguration) => void) => {
        pushViewerConfiguration = listen;

        return { dispose: () => (pushViewerConfiguration = undefined) };
      },
    } as never,
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

/**
 * A first load used to decode every source it held. For a folder of thousands that was the
 * whole memory problem, so the host now says what it has and waits to be asked — the view
 * knows what it can actually see, and this side does not.
 */
describe('WebviewHost: a first load decodes nothing', () => {
  it('hands over the session and the sources, and asks for no pixels', async () => {
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

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith('sources:update'));
    expect(decodeFromSource).not.toHaveBeenCalled();
    expect(posted.mock.calls.map(([type]) => type))
      .toEqual(['session:start', 'view:config:update', 'sources:update']);
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

/**
 * The backdrop and the tile size are the two settings a view may follow while it is open —
 * changing one you cannot see until you reopen the file is a poor way to pick it.
 */
describe('WebviewHost: the viewer configuration', () => {
  it('sends what is configured when the view announces itself', async () => {
    const posted = vi.fn();
    const { receive } = mount(async (message) => {
      posted(message);

      return true;
    });

    receive({ type: 'app:ready' });

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith({
      type: 'view:config:update',
      config: DEFAULT_VIEWER_CONFIGURATION,
    }));
  });

  it('pushes a change into the view that is already open', async () => {
    const posted = vi.fn();

    mount(async (message) => {
      posted(message);

      return true;
    });

    pushViewerConfiguration?.({ tileSize: 300 });

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith({
      type: 'view:config:update',
      config: { tileSize: 300 },
    }));
  });

  it('stops following the settings once the view is gone', () => {
    const { host } = mount(async () => true);

    host.dispose();

    // The subscription belongs to the view, not to the window.
    expect(pushViewerConfiguration).toBeUndefined();
  });
});

/**
 * One toolbar for the window. A view opens on it, follows it while it is open, and hands its
 * own back when the user asks for it to be kept.
 */
describe('WebviewHost: the preserved toolbar', () => {
  const snapshot = { preserved: true, options: toPreservedOptions({ ...DEFAULT_DECODE_OPTIONS, flipY: true }) };

  it('tells a view what is being kept, as it starts', async () => {
    const posted = vi.fn();

    storedSnapshot = snapshot;

    const { receive } = mount(async (message) => {
      posted(message);

      return true;
    });

    receive({ type: 'app:ready' });

    await vi.waitFor(() => expect(posted)
      .toHaveBeenCalledWith({ type: 'decode:options:preserved', snapshot }));
  });

  it('says nothing of the sort when nothing has been kept', async () => {
    const posted = vi.fn();
    const { receive } = mount(async (message) => {
      posted(message.type);

      return true;
    });

    receive({ type: 'app:ready' });

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith('sources:update'));
    expect(posted).not.toHaveBeenCalledWith('decode:options:preserved');
  });

  it('keeps what a view hands it', async () => {
    const { receive } = mount(async () => true);

    receive({ type: 'decode:options:snapshot', snapshot });

    await vi.waitFor(() => expect(writtenSnapshots).toEqual([snapshot]));
  });

  it('passes a change on to a view that is already open', async () => {
    const posted = vi.fn();

    mount(async (message) => {
      posted(message);

      return true;
    });

    pushToolbarSnapshot?.(snapshot);

    await vi.waitFor(() => expect(posted)
      .toHaveBeenCalledWith({ type: 'decode:options:preserved', snapshot }));
  });

  it('stops following once the view is gone', () => {
    const { host } = mount(async () => true);

    host.dispose();

    expect(pushToolbarSnapshot).toBeUndefined();
  });
});

/**
 * A decode is posted a chunk at a time, and only one run is alive. Both exist for the same
 * reason: a fling asks for every window it passes through, and all but the last are wasted.
 */
describe('WebviewHost: decoding a window', () => {
  const sources = (count: number): FileSource[] => Array.from(
    { length: count },
    (_, index) => ({ id: `s${index}`, name: `${index}.raw`, uri: Uri.file(`/${index}.raw`) as never }),
  );

  const decoded = (given: FileSource[]) => given.map(({ id }) => ({ status: 'failure', id, message: 'stubbed' }));

  it('posts a chunk at a time rather than one message for everything', async () => {
    const images = vi.fn();
    const { receive } = mount(
      async (message) => {
        if (message.type === 'images:decode:ready') {
          images(message.images.length);
        }

        return true;
      },
      undefined,
      [],
      { decodeFromSource: async (given: FileSource[]) => decoded(given) },
    );

    receive({ type: 'sources:request:decode', ids: sources(30), options: DEFAULT_DECODE_OPTIONS });

    // 24 to a chunk, so thirty sources arrive as a full one and a remainder.
    await vi.waitFor(() => expect(images).toHaveBeenCalledTimes(2));
    expect(images.mock.calls.map(([size]) => size)).toEqual([24, 6]);
  });

  it('hands the decoder a signal, which it never used to get', async () => {
    const signals: (AbortSignal | undefined)[] = [];
    const { receive } = mount(
      async () => true,
      undefined,
      [],
      {
        decodeFromSource: async (given: FileSource[], _options: unknown, signal?: AbortSignal) => {
          signals.push(signal);

          return decoded(given);
        },
      },
    );

    receive({ type: 'sources:request:decode', ids: sources(1), options: DEFAULT_DECODE_OPTIONS });

    await vi.waitFor(() => expect(signals).toHaveLength(1));
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[0]?.aborted).toBe(false);
  });

  it('abandons the run in flight when a newer window asks', async () => {
    const seen: AbortSignal[] = [];
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    const { receive } = mount(
      async () => true,
      undefined,
      [],
      {
        decodeFromSource: async (given: FileSource[], _options: unknown, signal: AbortSignal) => {
          seen.push(signal);
          await held;

          return decoded(given);
        },
      },
    );

    receive({ type: 'sources:request:decode', ids: sources(1), options: DEFAULT_DECODE_OPTIONS });
    await vi.waitFor(() => expect(seen).toHaveLength(1));

    receive({ type: 'sources:request:decode', ids: sources(1), options: DEFAULT_DECODE_OPTIONS });
    await vi.waitFor(() => expect(seen).toHaveLength(2));

    release?.();

    // The first run's window has moved on; the second is the one still wanted.
    expect(seen[0]?.aborted).toBe(true);
    expect(seen[1]?.aborted).toBe(false);
  });

  /** An abandoned run must not paint: those pixels describe a viewport nobody is looking at. */
  it('posts nothing from a run that was abandoned', async () => {
    const images = vi.fn();
    const { receive } = mount(
      async (message) => {
        if (message.type === 'images:decode:ready') {
          images();
        }

        return true;
      },
      undefined,
      [],
      {
        decodeFromSource: async (given: FileSource[], _options: unknown, signal: AbortSignal) => {
          // What the real decoder does once a read is superseded: it throws rather than report.
          await Promise.resolve();

          if (signal.aborted) {
            throw new Error('aborted');
          }

          return decoded(given);
        },
      },
    );

    const request = { type: 'sources:request:decode', ids: sources(48), options: DEFAULT_DECODE_OPTIONS } as const;

    receive(request);
    receive(request);

    await vi.waitFor(() => expect(images).toHaveBeenCalled());

    // Two chunks from the surviving run, and none from the one it replaced.
    expect(images).toHaveBeenCalledTimes(2);
  });
});
