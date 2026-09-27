import { exportSelected } from '../../image/export/exportSelected';
import type { WebviewSessionCommunicationBridge } from '../../session/WebviewSessionCommunicationBridge';
import { StoreSliceId } from '../../store/definitions';
import type { AppStore } from '../../store/types';

import type { WebviewHostMessageResolverMap } from './types';

export const WEBVIEW_HOST_MESSAGE_RESOLVERS = (
  store: AppStore,
  bridge: WebviewSessionCommunicationBridge,
): WebviewHostMessageResolverMap => ({
  "sources:update": (message) => {
    store.get(StoreSliceId.Sources).upsert(message.sources);
  },

  "status:error": (message) => {
    console.error('WebviewHost reported an error:', message.message);
  },

  "session:start": (message) => {
    store.get(StoreSliceId.View).setMode(message.viewMode);
    store.get(StoreSliceId.DecodeOptions).setOptions(message.decodeOptions);
  },

  export: () => {
    return exportSelected(store, bridge);
  },

  "images:decode:ready": (message) => {
    store.get(StoreSliceId.Images).upsert(message.images);
  }
});
