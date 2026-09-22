import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type { BufferItemData } from '@features/buffer';

import { StoreSliceId } from '../store/definitions';
import type { AppStore } from '../store/types';
import { RIV_COMMAND_EVENT_ID, WEBVIEW_COMMAND_RESOLVERS, WebviewCommandType } from './definitions';
import type { WebviewCommandResolver, WebviewCommandResolversMap } from './types';
import { WebviewCommandDispatcher } from './webviewCommandDispatcher';

/**
 * The dispatcher is the command bus's sync edge: a DOM listener hands it a command and
 * cannot wait for the outcome. Whatever a resolver does — return, throw, reject — has to
 * end here, handled. Vitest fails the run on an unhandled rejection, which is how the
 * voided export showed itself; these tests would do the same.
 */

let consoleError: MockInstance;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function dispatcherWith(exportRequest: WebviewCommandResolver<WebviewCommandType.ExportRequest>): WebviewCommandDispatcher {
  const resolvers: WebviewCommandResolversMap = {
    [WebviewCommandType.AppReady]: vi.fn(),
    [WebviewCommandType.ExportRequest]: exportRequest,
    [WebviewCommandType.GalleryOpenItem]: vi.fn(),
    [WebviewCommandType.WebviewConnected]: vi.fn(),
  };

  return new WebviewCommandDispatcher(resolvers);
}

describe('WebviewCommandDispatcher: the last-resort boundary', () => {
  const failure = new Error('resolver blew up');

  it.each([
    ['rejects', async () => {
      throw failure;
    }],
    ['throws synchronously', () => {
      throw failure;
    }],
  ])('a resolver that %s is caught and logged, and dispatch itself never throws', async (_label, resolver) => {
    const dispatcher = dispatcherWith(resolver);

    expect(() => dispatcher.dispatch({ type: WebviewCommandType.ExportRequest })).not.toThrow();

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith('Command "export:request" failed:', failure));
  });
});

describe('WebviewCommandDispatcher: the export path, end to end', () => {
  /** A webview whose canvas has no 2D context: the case that used to leak as an unhandled rejection. */
  class ContextlessOffscreenCanvas {
    public getContext(): null {
      return null;
    }
  }

  const item: BufferItemData = { id: 'a', name: 'frame.raw', data: new ArrayBuffer(8) };
  const store = {
    selectors: { selectedId: () => item.id },
    get: (id: StoreSliceId) => (id === StoreSliceId.Sources
      ? { getItem: () => item }
      : { decode: async () => ({ width: 2, height: 2, close: vi.fn() }) }),
  } as unknown as AppStore;

  it('a riv:command export with a failing encoder reaches the user as an error status', async () => {
    vi.stubGlobal('OffscreenCanvas', ContextlessOffscreenCanvas);
    const post = vi.fn();
    const target = new EventTarget();

    new WebviewCommandDispatcher(WEBVIEW_COMMAND_RESOLVERS({ postToWebviewHost: post } as never, store)).listen(target);
    target.dispatchEvent(new CustomEvent(RIV_COMMAND_EVENT_ID, { detail: { type: WebviewCommandType.ExportRequest } }));

    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(post).toHaveBeenCalledWith({
      type: 'app:status',
      level: 'error',
      message: 'Raw Image Viewer: export failed — encodePng: could not get a 2d context',
    });
  });

  it('is stopped by the export\'s own boundary, so the dispatcher\'s last resort is never reached', async () => {
    vi.stubGlobal('OffscreenCanvas', ContextlessOffscreenCanvas);
    const post = vi.fn();

    new WebviewCommandDispatcher(WEBVIEW_COMMAND_RESOLVERS({ postToWebviewHost: post } as never, store))
      .dispatch({ type: WebviewCommandType.ExportRequest });

    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith('Raw Image Viewer: export failed', expect.any(Error));
  });
});
