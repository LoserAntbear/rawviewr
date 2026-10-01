import { attemptDetached } from '@utils/attempt';

import type { WebviewHostMessage, WebviewHostMessageType, WebviewMessage } from '../webviewHost';
import { listenTo } from '../disposable/listenTo';
import type { WebviewDisposable } from '../disposable/types';
import type { MessageForwardMap, MessageResolverMap, ResolverContext } from '../messaging/types';
import { TypedEventTarget, type EventMap } from '../messaging/TypedEventTarget/TypedEventTarget';
import { VSCodeWebviewApi, WebviewHostMessageEvents } from './types';

let acquiredApi: VSCodeWebviewApi | null = null;

/**
 * `acquireVsCodeApi` throws if called more than once per webview, so the call is memoised.
 * Abstaining from global const import on purpose to avoid import-level calls.
 */
function acquireApiOnce(): VSCodeWebviewApi {
  acquiredApi ??= acquireVsCodeApi<unknown, WebviewMessage>();

  return acquiredApi;
}

export class WebviewSessionCommunicationBridge extends TypedEventTarget<WebviewHostMessageEvents> {
  private readonly CHANNEL_ID = 'Host message';

  constructor(private readonly api: VSCodeWebviewApi = acquireApiOnce()) {
    super();
  }

  public postToWebviewHost(message: WebviewMessage): void {
    this.api.postMessage(message);
  }

  public subscribeResolvers<TExtra extends object = object>(
    resolvers: MessageResolverMap<WebviewHostMessage, ResolverContext & TExtra>,
    extra: TExtra = {} as TExtra,
  ): WebviewDisposable {
    const context = { bridge: this, ...extra } as ResolverContext & TExtra;

    const disposables = Object.entries(resolvers).map(([type, resolve]) => this.on(
      type as WebviewHostMessageType,
      (event) => attemptDetached(
        () => resolve(event.detail as never, context as never),
        (error) => console.error(`${this.CHANNEL_ID}: "${type}" failed:`, error),
      ),
    ));

    return { dispose: () => disposables.forEach((dispose) => dispose()) };
  }

  // TODO: Uninfy with subscribeResolvers
  public forwardFrom<TEvents extends EventMap, TExtra extends object = object>(
    bus: TypedEventTarget<TEvents>,
    forwards: MessageForwardMap<TEvents, ResolverContext & TExtra>,
    extra: TExtra = {} as TExtra,
  ): WebviewDisposable {
    const context = { bridge: this, ...extra } as ResolverContext & TExtra;

    const disposables = Object.entries(forwards).map(([type, forward]) => bus.on(
      type as keyof TEvents & string,
      (event) => attemptDetached(
        () => this.postForwarded(forward(event.detail as never, context as never)),
        (error) => console.error(`${this.CHANNEL_ID}: forwarding "${type}" failed:`, error),
      ),
    ));

    return { dispose: () => disposables.forEach((dispose) => dispose()) };
  }

  // WARNING: Do not forget to dispose to stop re-emitting.
  public listen(target: EventTarget = window): WebviewDisposable {
    return listenTo(target, 'message', (event: Event) => {
      const message = (event as MessageEvent<WebviewHostMessage>).data;

      this.emit(message.type, message);
    });
  }

  /** A forward that has nothing to say returns `null`, and nothing is sent. */
  private postForwarded(message: WebviewMessage | null): void {
    if (message) {
      this.postToWebviewHost(message);
    }
  }
}
