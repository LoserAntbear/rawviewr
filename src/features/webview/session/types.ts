import type { WebviewHostMessage, WebviewHostMessageType, WebviewMessage } from '../webviewHost';

export type VSCodeWebviewApi = ReturnType<typeof acquireVsCodeApi<unknown, WebviewMessage>>;

export type WebviewHostMessageEvents = {
  readonly [K in WebviewHostMessageType]: Extract<WebviewHostMessage, { type: K }>;
};
