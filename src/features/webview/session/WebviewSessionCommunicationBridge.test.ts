import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { createWebviewStore } from '../store/createWebviewStore';
import { StoreSliceId } from '../store/definitions';
import type { AppStore } from '../store/types';
import { WEBVIEW_HOST_MESSAGE_RESOLVERS } from '../webviewHost/messageDispatcher';
import type { WebviewHostMessage } from '../webviewHost/types';
import type { WebviewDisposable } from '../disposable/types';
import { TypedEventTarget } from '../messaging';
import { WebviewSessionCommunicationBridge } from './WebviewSessionCommunicationBridge';

/**
 * The line between the two processes, and a bus on this side of it: what arrives from the
 * host is re-emitted by type, and a resolver is a subscription to that — nothing dispatches.
 */

let consoleError: MockInstance;
let post: ReturnType<typeof vi.fn>;
let target: EventTarget;
let bridge: WebviewSessionCommunicationBridge;
let listening: WebviewDisposable;
let store: AppStore;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  post = vi.fn();
  target = new EventTarget();
  bridge = new WebviewSessionCommunicationBridge({ postMessage: post } as never);
  ({ store } = createWebviewStore());

  listening = bridge.listen(target);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const deliver = (message: WebviewHostMessage) =>
  target.dispatchEvent(new MessageEvent('message', { data: message }));

describe('WebviewSessionCommunicationBridge: the channel', () => {
  it('re-emits what the host sends, under the message\'s own type', () => {
    const heard = vi.fn();

    bridge.on('sources:update', (event) => heard(event.detail));
    deliver({ type: 'sources:update', sources: [] });

    expect(heard).toHaveBeenCalledWith({ type: 'sources:update', sources: [] });
  });

  it('wakes only the subscribers of that type', () => {
    const other = vi.fn();

    bridge.on('images:decode:ready', other);
    deliver({ type: 'sources:update', sources: [] });

    expect(other).not.toHaveBeenCalled();
  });

  it('stops re-emitting once disposed', () => {
    const heard = vi.fn();

    bridge.on('sources:update', heard);
    listening.dispose();
    deliver({ type: 'sources:update', sources: [] });

    expect(heard).not.toHaveBeenCalled();
  });

  it('posts outbound messages through the webview api', () => {
    bridge.postToWebviewHost({ type: 'app:ready' });

    expect(post).toHaveBeenCalledWith({ type: 'app:ready' });
  });
});

describe('WebviewSessionCommunicationBridge.subscribeResolvers', () => {
  it('hands the resolver its message and the context it acts through', () => {
    const resolve = vi.fn();

    bridge.subscribeResolvers({ 'status:error': resolve }, { store });
    deliver({ type: 'status:error', message: 'nope' });

    // The channel assembled it: itself, plus what it was handed.
    expect(resolve).toHaveBeenCalledWith({ type: 'status:error', message: 'nope' }, { bridge, store });
  });

  it.each([
    ['throws', () => {
      throw new Error('resolver blew up');
    }],
    ['rejects', async () => {
      throw new Error('resolver blew up');
    }],
  ])('catches and reports a resolver that %s, naming its channel', async (_label, resolve) => {
    bridge.subscribeResolvers({ 'status:error': resolve }, { store });

    expect(() => deliver({ type: 'status:error', message: 'nope' })).not.toThrow();

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
      'Host message: "status:error" failed:',
      expect.objectContaining({ message: 'resolver blew up' }),
    ));
  });

  it('ignores a message no entry claims — a bus has nothing to look up', () => {
    bridge.subscribeResolvers({ 'status:error': vi.fn() }, { store });

    expect(() => deliver({ type: 'sources:update', sources: [] })).not.toThrow();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('lets go of every subscription at once', () => {
    const resolve = vi.fn();

    bridge.subscribeResolvers({ 'status:error': resolve }, { store }).dispose();
    deliver({ type: 'status:error', message: 'nope' });

    expect(resolve).not.toHaveBeenCalled();
  });
});

describe('the host channel, end to end', () => {
  it('carries a host message into the store with no dispatcher in between', () => {
    bridge.subscribeResolvers(WEBVIEW_HOST_MESSAGE_RESOLVERS, { store });

    deliver({
      type: 'sources:update',
      sources: [{ id: 'a', name: 'a.raw', uri: { path: '/a.raw' } as never }],
    });

    expect(store.get(StoreSliceId.Sources).getSource('a')).toMatchObject({ name: 'a.raw' });
  });
});

describe('WebviewSessionCommunicationBridge.forwardFrom', () => {
  type Events = { 'thing:happened': { value: number } };

  const bus = () => new TypedEventTarget<Events>();

  it('sends what the table makes of the event', () => {
    const announcing = bus();

    bridge.forwardFrom(announcing, {
      'thing:happened': ({ value }) => ({ type: 'gallery:openItem', id: String(value) }),
    }, { store });

    announcing.emit('thing:happened', { value: 7 });

    expect(post).toHaveBeenCalledWith({ type: 'gallery:openItem', id: '7' });
  });

  it('hands the table the context, the channel included', () => {
    const announcing = bus();
    const forward = vi.fn(() => null);

    bridge.forwardFrom(announcing, { 'thing:happened': forward }, { store });
    announcing.emit('thing:happened', { value: 7 });

    expect(forward).toHaveBeenCalledWith({ value: 7 }, { bridge, store });
  });

  it('sends nothing for an event the table has nothing to say about', () => {
    const announcing = bus();

    bridge.forwardFrom(announcing, { 'thing:happened': () => null }, { store });
    announcing.emit('thing:happened', { value: 7 });

    expect(post).not.toHaveBeenCalled();
  });

  it('catches and reports a forward that throws, rather than breaking the emitter', async () => {
    const announcing = bus();

    bridge.forwardFrom(announcing, {
      'thing:happened': () => {
        throw new Error('forward blew up');
      },
    }, { store });

    expect(() => announcing.emit('thing:happened', { value: 7 })).not.toThrow();

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(
      'Host message: forwarding "thing:happened" failed:',
      expect.objectContaining({ message: 'forward blew up' }),
    ));
  });

  it('stops forwarding once disposed', () => {
    const announcing = bus();

    bridge.forwardFrom(announcing, {
      'thing:happened': () => ({ type: 'app:ready' }),
    }, { store }).dispose();

    announcing.emit('thing:happened', { value: 7 });

    expect(post).not.toHaveBeenCalled();
  });
});
