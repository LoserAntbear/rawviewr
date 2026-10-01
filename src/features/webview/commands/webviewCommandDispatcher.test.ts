import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type { ImageItem } from '../store/slice/ImagesSlice';
import type { AppStore } from '../store/types';
import { RIV_COMMAND_EVENT_ID } from './definitions';
import { WEBVIEW_COMMAND_RESOLVERS } from './resolvers';
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

function dispatcherWith(exportRequest: WebviewCommandResolver<'export:request'>): WebviewCommandDispatcher {
  const resolvers: WebviewCommandResolversMap = {
    'app:ready': vi.fn(),
    'export:request': exportRequest,
    'gallery:openItem': vi.fn(),
  };

  return new WebviewCommandDispatcher(resolvers, { postToWebviewHost: vi.fn() }, { store: {} as never });
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

    expect(() => dispatcher.dispatch({ type: 'export:request' })).not.toThrow();

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith('Command: "export:request" failed:', failure));
  });
});

describe('WebviewCommandDispatcher: the export path, end to end', () => {
  /** A webview whose canvas has no 2D context: the case that used to leak as an unhandled rejection. */
  class ContextlessOffscreenCanvas {
    public getContext(): null {
      return null;
    }
  }

  const image: ImageItem = {
    id: 'a',
    kind: 'ready',
    status: 'success',
    name: 'frame.raw',
    detail: null,
    byteLength: 24,
    geometry: { width: 2, height: 2 } as never,
    bitmap: { width: 2, height: 2, close: vi.fn() } as unknown as ImageBitmap,
  };
  const store = {
    selectors: { selectedId: () => image.id },
    get: () => ({ getImage: () => image }),
  } as unknown as AppStore;

  it('a riv:command export with a failing encoder reaches the user as an error status', async () => {
    vi.stubGlobal('OffscreenCanvas', ContextlessOffscreenCanvas);
    const post = vi.fn();
    const target = new EventTarget();

    new WebviewCommandDispatcher(WEBVIEW_COMMAND_RESOLVERS, { postToWebviewHost: post }, { store }).listen(target);
    target.dispatchEvent(new CustomEvent(RIV_COMMAND_EVENT_ID, { detail: { type: 'export:request' } }));

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

    new WebviewCommandDispatcher(WEBVIEW_COMMAND_RESOLVERS, { postToWebviewHost: post }, { store })
      .dispatch({ type: 'export:request' });

    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith('Raw Image Viewer: export failed', expect.any(Error));
  });
});

describe('WebviewCommandDispatcher: the context', () => {
  it('hands each resolver what it acts through, so a table needs no constructing', async () => {
    const resolve = vi.fn();
    const bridge = { postToWebviewHost: vi.fn() };
    const store = { marker: 'store' } as never;

    new WebviewCommandDispatcher({ 'app:ready': resolve }, bridge, { store }).dispatch({ type: 'app:ready' });

    // The channel assembled it: itself, plus what it was handed.
    await vi.waitFor(() => expect(resolve).toHaveBeenCalledWith({ type: 'app:ready' }, { bridge, store }));
  });
});

describe('WebviewCommandDispatcher: a message nobody resolves', () => {
  it('says so rather than passing it over in silence', async () => {
    new WebviewCommandDispatcher({}, { postToWebviewHost: vi.fn() }, { store: {} as never }).dispatch({ type: 'app:status', level: 'info', message: 'hi' });

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
      'Command: "app:status" failed:',
      expect.objectContaining({ message: 'Command: nothing resolves "app:status".' }),
    ));
  });
});
