import { afterEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import type { WebviewHostMessage } from '../types';

import { HostMessageBridge } from './HostMessageBridge';

let consoleError: MockInstance;

afterEach(() => {
  vi.restoreAllMocks();
});

const message: WebviewHostMessage = { type: 'sources:update', sources: [] };

describe('HostMessageBridge.post', () => {
  it('hands the message to the webview', async () => {
    const postMessage = vi.fn(async () => true);

    await new HostMessageBridge({ postMessage } as never).post(message);

    expect(postMessage).toHaveBeenCalledWith(message);
  });

  /**
   * `postMessage` resolves to whether the webview took it. Awaiting the promise's truthiness
   * instead of its value would call every delivery a success, including to a view that is gone.
   */
  it('reports a message the webview dropped', async () => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await new HostMessageBridge({ postMessage: async () => false } as never).post(message);

    expect(consoleError).toHaveBeenCalledWith('WebviewHost: Failed to post message to webview:', message);
  });
});

describe('HostMessageBridge.listen', () => {
  it('hands what arrives to the target, and gives back the subscription', () => {
    const dispatch = vi.fn();
    const dispose = vi.fn();
    let received: ((message: unknown) => void) | undefined;

    const subscription = new HostMessageBridge({
      onDidReceiveMessage: (listener: (message: unknown) => void) => {
        received = listener;

        return { dispose };
      },
    } as never).listen({ dispatch });

    received?.({ type: 'app:ready' });

    expect(dispatch).toHaveBeenCalledWith({ type: 'app:ready' });

    subscription.dispose();

    expect(dispose).toHaveBeenCalled();
  });
});
