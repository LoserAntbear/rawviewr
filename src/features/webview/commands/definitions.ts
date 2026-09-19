import { WebviewSessionCommunicationBridge } from '../session/WebviewSessionCommunicationBridge';
import { exportSelected } from '../image/export/exportSelected';
import type { AppStore } from '../store/types';
import type { WebviewCommandResolversMap } from './types';

export const RIV_COMMAND_EVENT_ID = 'riv:command' as const;

export enum WebviewCommandType {
  AppReady = 'app:ready',
  ExportRequest = 'export:request',
  GalleryOpenItem = 'gallery:openItem',
  WebviewConnected = 'webview:connected',
}

export const WEBVIEW_COMMAND_RESOLVERS = (
  bridge: WebviewSessionCommunicationBridge,
  store: AppStore,
): WebviewCommandResolversMap => ({
  [WebviewCommandType.ExportRequest]: () => exportSelected(store, bridge),
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
