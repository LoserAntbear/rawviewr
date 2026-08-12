import { HostMessage, WebviewMessage } from './types';

// Can be called ONLY ONCE, thus safer to make as a global singleton
const VSCODE_API = acquireVsCodeApi<unknown, WebviewMessage>();

type WebviewCommunicationBridge = {
  postToWebviewHost: (message: WebviewMessage) => void;
  handleFromWebviewHost: (handler: (message: HostMessage) => void) => void;
};

/**
 * There's virtually no reason to have more than one instance of this bridge, so let's make it a singleton.
 */
export const WEBVIEW_COMM_BRIDGE: WebviewCommunicationBridge = {
  postToWebviewHost: (message: WebviewMessage) => {
    VSCODE_API.postMessage(message);
  },
  handleFromWebviewHost: (handler: (message: HostMessage) => void) => {
    window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
      handler(event.data);
    });
  },
};