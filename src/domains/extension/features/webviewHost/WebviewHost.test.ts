import { Uri, window } from 'vscode';

import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { ContentViewSession } from '@EXTENSION/features/viewer/contentViewSession';
import { DEFAULT_DECODE_OPTIONS } from '@SHARED/features/image/imageDecoder/definitions';
import type { WebviewHostMessage, WebviewMessage } from '@SHARED/features/messaging/protocol';
import type { ViewerConfiguration } from '@SHARED/features/settings/configuration/types';
import { type ToolbarOptionsSnapshot, toPreservedOptions } from '@SHARED/features/settings/snapshot';
import { DEFAULT_VIEWER_CONFIGURATION, ViewerBackground } from '@SHARED/features/viewer/definitions';
import type { FileSource } from '@SHARED/features/viewer/types';

import { WebviewHost } from './WebviewHost';

/**
 * One view, driven the way VS Code drives it: a message arrives, and whatever the host does
 * about it has to end somewhere handled. The listener is a sync edge VS Code does not await,
 * so nothing may escape as an unhandled rejection — vitest fails the run on those, which is
 * how these earn their keep.
 */
let consoleError: MockInstance;
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
  uriOpener?: { openSingle(targets: readonly unknown[]): Promise<void> },
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
    new ContentViewSession('gallery', sources),
    {
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
    uriOpener as never,
  );

  return { host, receive: (message: WebviewMessage) => receive(message) };
}

const postedTypes = (posted: ReturnType<typeof vi.fn>): string[] => posted.mock.calls
  .map(([message]) => (message as WebviewHostMessage).type);

/** Lets every queued continuation run, so "has not happened" means it was never going to. */
const drain = async (): Promise<void> => {
  for (let pass = 0; pass < 5; pass += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

describe('WebviewHost: the outward requests', () => {
  it('asks the view to zoom, on the same slice every other way in uses', async () => {
    const postMessage = vi.fn(async () => true);
    const { host } = mount(postMessage);

    await host.postToWebview({ type: 'view:zoom', direction: 'out' });

    expect(postMessage).toHaveBeenCalledWith({ type: 'view:zoom', direction: 'out' });
  });
});

/**
 * A first load used to decode every source it held. For a folder of thousands that was the
 * whole memory problem, so the host says what it has and waits to be asked — the view knows
 * what it can actually see and this side does not.
 */
describe('WebviewHost: a first load decodes nothing', () => {
  it('hands over the session and the sources, and asks for no pixels', async () => {
    const posted = vi.fn();
    const decodeFromSource = vi.fn(async () => []);
    const { receive } = mount(
      async (message) => {
        posted(message);

        return true;
      },
      undefined,
      [source],
      { decodeFromSource },
    );

    receive({ type: 'app:ready' });

    await vi.waitFor(() => expect(postedTypes(posted)).toContain('sources:update'));
    expect(decodeFromSource).not.toHaveBeenCalled();
    expect(postedTypes(posted)).toEqual(['session:start', 'view:config:update', 'sources:update']);
  });

  it('offers a kept toolbar when there is one, before the sources land', async () => {
    storedSnapshot = { preserved: true, options: toPreservedOptions(DEFAULT_DECODE_OPTIONS) };

    const posted = vi.fn();
    const { receive } = mount(async (message) => {
      posted(message);

      return true;
    });

    receive({ type: 'app:ready' });

    await vi.waitFor(() => expect(postedTypes(posted)).toContain('sources:update'));
    expect(postedTypes(posted)).toEqual([
      'session:start',
      'decode:options:preserved',
      'view:config:update',
      'sources:update',
    ]);
  });

  it('says nothing of the sort when nothing has been kept', async () => {
    const posted = vi.fn();
    const { receive } = mount(async (message) => {
      posted(message);

      return true;
    });

    receive({ type: 'app:ready' });

    await vi.waitFor(() => expect(postedTypes(posted)).toContain('sources:update'));
    expect(postedTypes(posted)).not.toContain('decode:options:preserved');
  });
});

/**
 * Which image was exported used to be guesswork: the payload carried a name and bytes but not
 * an id, so the host reached for `sources[0]`. The save dialog's default directory comes from
 * that source, so a gallery spanning folders offered the wrong one — with the right name on
 * it, which is what kept it quiet.
 */
describe('WebviewHost: exporting the image that was actually exported', () => {
  const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;

  const gallery = (): FileSource[] => [
    { id: 'a', name: 'a.raw', uri: Uri.file('/first/a.raw') as never },
    { id: 'b', name: 'b.raw', uri: Uri.file('/second/b.raw') as never },
  ];

  const exportFrom = (id: string) => {
    const { receive } = mount(async () => true, undefined, gallery());

    receive({ type: 'export:png', id, name: `${id}.raw.png`, data: png() });
  };

  const offeredDirectory = () => vi.mocked(window.showSaveDialog).mock.calls
    .map(([options]) => options?.defaultUri?.path)
    .at(-1);

  it('offers to save beside the file it came from, not beside the first one', async () => {
    exportFrom('b');

    await vi.waitFor(() => expect(window.showSaveDialog).toHaveBeenCalled());
    expect(offeredDirectory()).toContain('/second/');
  });

  it('still gets the first one right', async () => {
    exportFrom('a');

    await vi.waitFor(() => expect(window.showSaveDialog).toHaveBeenCalled());
    expect(offeredDirectory()).toContain('/first/');
  });

  /** An id nothing answers to leaves the dialog its own default rather than guessing. */
  it('offers no directory for an id it does not hold', async () => {
    exportFrom('invented');

    await vi.waitFor(() => expect(window.showSaveDialog).toHaveBeenCalled());
    expect(offeredDirectory()).toBeUndefined();
  });
});

describe('WebviewHost: answering the webview', () => {
  it('opens the item the view named, resolved against its own sources', async () => {
    const openSingle = vi.fn(async () => undefined);
    const { receive } = mount(async () => true, { openSingle }, [source]);

    receive({ type: 'gallery:openItem', id: 'a' });

    await vi.waitFor(() => expect(openSingle).toHaveBeenCalledWith([source.uri]));
  });

  /** A view can only ever name a source it was opened with; an invented id comes to nothing. */
  it('opens nothing for an id it does not hold', async () => {
    const openSingle = vi.fn(async () => undefined);
    const { receive } = mount(async () => true, { openSingle }, [source]);

    receive({ type: 'gallery:openItem', id: '/etc/passwd' });

    await vi.waitFor(() => expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('nothing resolves'),
      expect.anything(),
    ));
    expect(openSingle).not.toHaveBeenCalled();
  });

  it('keeps the toolbar the view handed it', async () => {
    const snapshot: ToolbarOptionsSnapshot = {
      preserved: true,
      options: toPreservedOptions(DEFAULT_DECODE_OPTIONS),
    };
    const { receive } = mount(async () => true);

    receive({ type: 'decode:options:snapshot', snapshot });

    await vi.waitFor(() => expect(writtenSnapshots).toEqual([snapshot]));
  });

  it('decodes what the view asked for and sends the pixels back', async () => {
    const posted = vi.fn();
    const decodeFromSource = vi.fn(async (given: FileSource[]) => given.map(
      ({ id }) => ({ status: 'failure', id, message: 'stubbed' }),
    ));
    const { receive } = mount(
      async (message) => {
        posted(message);

        return true;
      },
      undefined,
      [source],
      { decodeFromSource },
    );

    receive({ type: 'sources:request:decode', ids: [source], options: DEFAULT_DECODE_OPTIONS });

    await vi.waitFor(() => expect(postedTypes(posted)).toContain('images:decode:ready'));
    expect(decodeFromSource).toHaveBeenCalledWith([source], DEFAULT_DECODE_OPTIONS, expect.any(AbortSignal));
  });

  /**
   * The instalments are pulled, so this side is what paces the decode: awaiting each delivery
   * before taking the next chunk is what keeps a folder's worth of pixels from being alive at
   * once. Collecting the deliveries and awaiting them at the end would read everything while
   * they were still in flight, and hold every decoded image until they landed.
   */
  it('waits for a delivery before reading the chunk behind it', async () => {
    const reads: number[] = [];
    let releaseFirstPost: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      releaseFirstPost = resolve;
    });
    let posts = 0;

    const many = Array.from({ length: 30 }, (_, index) => ({
      id: `s${index}`,
      name: `${index}.raw`,
      uri: Uri.file(`/${index}.raw`) as never,
    }));

    const { receive } = mount(
      async () => {
        posts += 1;

        if (posts === 1) {
          await held;
        }

        return true;
      },
      undefined,
      many,
      {
        decodeFromSource: async (given: FileSource[]) => {
          reads.push(given.length);

          return given.map(({ id }) => ({ status: 'failure', id, message: 'stubbed' }));
        },
      },
    );

    receive({ type: 'sources:request:decode', ids: many, options: DEFAULT_DECODE_OPTIONS });

    // The first delivery has been attempted and is held, so a reader that paces itself is now
    // stuck on it. Draining the queue gives one that does not every chance to run ahead.
    await vi.waitFor(() => expect(posts).toBe(1));
    await drain();

    // Thirty sources at a chunk of 24 is two instalments, and only the first has been read.
    expect(reads).toEqual([24]);

    releaseFirstPost?.();

    await vi.waitFor(() => expect(reads).toEqual([24, 6]));
  });
});

/**
 * Settings a user changes while looking at a view should reach that view, so the host
 * subscribes on its behalf rather than making the view poll.
 */
describe('WebviewHost: what the settings push', () => {
  it('passes a kept toolbar on as it changes', async () => {
    const posted = vi.fn();

    mount(async (message) => {
      posted(message);

      return true;
    });

    const snapshot: ToolbarOptionsSnapshot = {
      preserved: true,
      options: toPreservedOptions(DEFAULT_DECODE_OPTIONS),
    };

    pushToolbarSnapshot?.(snapshot);

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith({ type: 'decode:options:preserved', snapshot }));
  });

  it('passes a changed configuration on', async () => {
    const posted = vi.fn();

    mount(async (message) => {
      posted(message);

      return true;
    });

    pushViewerConfiguration?.(DEFAULT_VIEWER_CONFIGURATION);

    await vi.waitFor(() => expect(posted).toHaveBeenCalledWith({
      type: 'view:config:update',
      config: DEFAULT_VIEWER_CONFIGURATION,
    }));
  });
});

/**
 * Every message ends at one boundary, and it names the message. An open that failed used to be
 * caught locally and logged, so a double-click did nothing with nothing said about it.
 */
describe('WebviewHost: failures end handled', () => {
  const failure = new Error('gone');

  it('tells the user when handling a message fails, rather than only the console', async () => {
    const { receive } = mount(async () => true, {
      openSingle: () => Promise.reject(failure),
    }, [source]);

    expect(() => receive({ type: 'gallery:openItem', id: 'a' })).not.toThrow();

    await vi.waitFor(() => expect(window.showErrorMessage)
      .toHaveBeenCalledWith('Failed to handle "gallery:openItem": gone'));
  });

  /**
   * The bridge absorbs a post that could not be delivered, on purpose — posting into a view
   * that is going away is ordinary, and a notification per message would be noise. So a
   * handshake that cannot be delivered is logged and nothing more.
   */
  it('keeps a failed delivery to the log', async () => {
    const { receive } = mount(() => Promise.reject(failure));

    receive({ type: 'app:ready' });

    await vi.waitFor(() => expect(consoleError)
      .toHaveBeenCalledWith('WebviewHost: Failed to post message to webview:', failure));
    expect(window.showErrorMessage).not.toHaveBeenCalled();
  });

  it('says so when nothing answers a message, rather than dropping it', async () => {
    const { receive } = mount(async () => true);

    // The switch this replaced had no `default`: an unhandled type did nothing and said nothing.
    expect(() => receive({ type: 'view:background:update', background: ViewerBackground.white }))
      .not.toThrow();

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
      'WebviewHost: "view:background:update" failed:',
      expect.objectContaining({ message: 'WebviewHost: nothing resolves "view:background:update".' }),
    ));
  });

  it('reports a message the webview dropped — it awaits the delivery, not the promise', async () => {
    const { host } = mount(async () => false);

    await host.postToWebview({ type: 'view:zoom', direction: 'in' });

    expect(consoleError).toHaveBeenCalledWith(
      'WebviewHost: Failed to post message to webview:',
      { type: 'view:zoom', direction: 'in' },
    );
  });
});
