import type { WebviewHostMessage, WebviewMessage } from '../webviewHost';
import { listenTo } from '../disposable/listenTo';
import type { WebviewDisposable } from '../disposable/types';

type VSCodeWebviewApi = ReturnType<typeof acquireVsCodeApi<unknown, WebviewMessage>>;
type WebviewHostMessageHandler = (message: WebviewHostMessage) => void;
let acquiredApi: VSCodeWebviewApi | null = null;

/**
 * `acquireVsCodeApi` throws if called more than once per webview, so the call is memoised.
 * Abstaining from global const import on purpose to avoid import-level calls.
 */
function acquireApiOnce(): VSCodeWebviewApi {
  acquiredApi ??= acquireVsCodeApi<unknown, WebviewMessage>();

  return acquiredApi;
}

export class WebviewSessionCommunicationBridge {
  constructor(private readonly api: VSCodeWebviewApi = acquireApiOnce()) {}

  public postToWebviewHost(message: WebviewMessage): void {
    this.api.postMessage(message);
  }

  public listenToWebviewHost(
    handler: WebviewHostMessageHandler,
    target: EventTarget = window,
  ): WebviewDisposable {
    return listenTo(target, 'message', (event: Event) => {
      handler((event as MessageEvent<WebviewHostMessage>).data);
    });
  }
}
