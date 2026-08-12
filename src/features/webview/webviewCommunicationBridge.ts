import { HostMessage, WebviewMessage } from './types';

// Can be called ONLY ONCE, thus safer to make as a global singleton
const VSCODE_API = acquireVsCodeApi<unknown, WebviewMessage>();

type WebviewCommunicationBridge = {
  postMessage: (message: WebviewMessage) => void;
  onMessage: (handler: (message: HostMessage) => void) => void;
};

export const WEBVIEW_COMM_BRIDGE: WebviewCommunicationBridge = {
  postMessage: (message: WebviewMessage) => {
    VSCODE_API.postMessage(message);
  },
  onMessage: (handler: (message: HostMessage) => void) => {
    window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
      handler(event.data);
    });
  },
};