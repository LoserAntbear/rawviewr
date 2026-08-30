import { WebviewSessionCommunicationBridge } from '../session/WebviewSessionCommunicationBridge';
import type { WebviewCommandResolversMap } from './types';

export const RIV_COMMAND_EVENT_ID = 'riv:command' as const;

export enum WebviewCommandType {
  Ready = 'ready',
  Connected = 'connected',
}

export const WEBVIEW_COMMAND_RESOLVERS = (
  bridge: WebviewSessionCommunicationBridge,
): WebviewCommandResolversMap => ({
  [WebviewCommandType.Connected]: (command) => {
    console.log('WEBVIEW_COMMAND_RESOLVERS: Handling connected command:', command);
    if (command.payload === 'riv-app-component') {
      bridge.postToWebviewHost({
        type: 'app:ready',
      });
    }
  },
  [WebviewCommandType.Ready]: (command) => {
    console.log('WEBVIEW_COMMAND_RESOLVERS: Handling ready command:', command);
    // Handle the 'ready' command from the webview if needed
  }
});
