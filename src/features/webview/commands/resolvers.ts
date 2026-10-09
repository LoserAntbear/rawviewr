import { StoreSliceId } from '../store/definitions';
import { exportSelected } from '../image/export/exportSelected';
import type { WebviewCommandResolversMap } from './types';

/**
 * Handlers for messages coming FROM the webview.
 * Usually you just pass them through to the host.
 */
export const WEBVIEW_COMMAND_RESOLVERS: WebviewCommandResolversMap = {
  'app:ready': (message, { bridge }) => bridge.postToWebviewHost(message),
  'gallery:openItem': (message, { bridge }) => bridge.postToWebviewHost(message),
  'export:request': (_message, { store, bridge }) => exportSelected(store, bridge),
  'sources:request:decode': (message, { bridge }) => bridge.postToWebviewHost(message),
  'view:zoom': ({ direction }, { store }) => store.get(StoreSliceId.View).setZoom(direction),
  'view:background:update': ({ background }, { store }) => store.get(StoreSliceId.View).setBackground(background),
};
