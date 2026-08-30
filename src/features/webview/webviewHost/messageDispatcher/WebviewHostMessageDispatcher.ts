import type { WebviewHostMessage } from '../types';
import type { WebviewHostMessageResolverMap } from './types';
import type { WebviewSessionCommunicationBridge } from '../../session/WebviewSessionCommunicationBridge';
import { WebviewDisposable } from '@features/webview/disposable/types';

export class WebviewHostMessageDispatcher {
  constructor(
    private readonly resolvers: WebviewHostMessageResolverMap,
    private readonly bridge: WebviewSessionCommunicationBridge,
  ) {}

  public dispatch(message: WebviewHostMessage): Promise<void> {
    try {
      const resolver = this.resolvers[message.type];

      if (!resolver) {
        throw new Error(`No resolver found for message type ${message.type}`);
      }

      return Promise.resolve(resolver(message));
    } catch (error) {
      console.error(`Failed to dispatch message ${message.type}:`, error);

      return Promise.reject(error);
    }
  }

  public listen(target?: EventTarget): WebviewDisposable {
    return this.bridge.listenToWebviewHost(this.handleMessage.bind(this), target);
  }

  private handleMessage(message: WebviewHostMessage): void {
    this.dispatch(message)
      .catch(
        (error) => console.error(`Error handling message ${message.type}:`, error),
      );
  }
}