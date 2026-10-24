import type { WebviewHostMessage, WebviewHostMessageType, WebviewMessage } from '@SHARED/features/messaging/protocol';

export type VSCodeWebviewApi = ReturnType<typeof acquireVsCodeApi<unknown, WebviewMessage>>;

export type WebviewHostMessageEvents = {
  readonly [K in WebviewHostMessageType]: Extract<WebviewHostMessage, { type: K }>;
};
