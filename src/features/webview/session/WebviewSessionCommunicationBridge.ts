import { HostMessage, WebviewMessage } from '../types';

// Can be called ONLY ONCE, thus safer to make as a global singleton
const VSCODE_API = acquireVsCodeApi<unknown, WebviewMessage>();

export type WebviewSessionCommunicationBridge = {
  postToWebviewHost: (message: WebviewMessage) => void;
  handleFromWebviewHost: (handler: (message: HostMessage) => void) => void;
};

/**
 * There's virtually no reason to have more than one instance of this bridge, so let's make it a singleton.
 */
export const WEBVIEW_SESSION_COMM_BRIDGE: WebviewSessionCommunicationBridge = {
  postToWebviewHost: (message: WebviewMessage) => {
    console.log('WebviewSessionCommunicationBridge: Posting message to webview host:', message);
    VSCODE_API.postMessage(message);
  },
  handleFromWebviewHost: (handler: (message: HostMessage) => void) => {
    window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
      console.log('WebviewSessionCommunicationBridge: Received message from webview host:', event.data);
      handler(event.data);
    });
  },
};
