import { WebviewSessionCommunicationBridge } from '../session/WebviewSessionCommunicationBridge';
import type { WebviewCommandResolversMap } from './types';

export const RIV_COMMAND_EVENT_ID = 'riv:command' as const;

export enum WebviewCommandType {
  AppReady = 'app:ready',
  GalleryOpenItem = 'gallery:openItem',
  WebviewConnected = 'webview:connected',
}

export const WEBVIEW_COMMAND_RESOLVERS = (
  bridge: WebviewSessionCommunicationBridge,
): WebviewCommandResolversMap => ({
  [WebviewCommandType.WebviewConnected]: (command) => {
    if (command.payload === 'riv-app-component') {
      bridge.postToWebviewHost({
        type: 'app:ready',
      });
    }
  },
  [WebviewCommandType.GalleryOpenItem]: (command) => {
    bridge.postToWebviewHost({ type: 'gallery:openItem', id: command.payload });
  },
  [WebviewCommandType.AppReady]: (command) => {
    console.log('WEBVIEW_COMMAND_RESOLVERS: Handling ready command:', command);
    // Handle the 'ready' command from the webview if needed
  }
});
