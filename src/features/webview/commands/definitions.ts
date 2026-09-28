import { WebviewSessionCommunicationBridge } from '../session/WebviewSessionCommunicationBridge';
import { exportSelected } from '../image/export/exportSelected';
import type { AppStore } from '../store/types';
import type { WebviewCommandResolversMap } from './types';

export const RIV_COMMAND_EVENT_ID = 'riv:command' as const;

/**
 * Handlers for messages coming FROM the webivew.
 * Usually you just pass them through to the host.
 */
export const WEBVIEW_COMMAND_RESOLVERS = (
  bridge: WebviewSessionCommunicationBridge,
  store: AppStore,
): WebviewCommandResolversMap => ({
  'export:request': () => exportSelected(store, bridge),
  'app:ready': (message) => bridge.postToWebviewHost(message),
  'gallery:openItem': (message) => bridge.postToWebviewHost(message),
});
