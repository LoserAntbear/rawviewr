import { exportSelected } from '../image/export/exportSelected';
import type { WebviewSessionCommunicationBridge } from '../session/WebviewSessionCommunicationBridge';
import { StoreSliceId } from '../store/definitions';
import type { AppStore } from '../store/types';
import type { WebviewHostMessageResolverMap } from './messageDispatcher';

export const WEBVIEW_HOST_MESSAGE_RESOLVERS = (
  store: AppStore,
  bridge: WebviewSessionCommunicationBridge,
): WebviewHostMessageResolverMap => ({
  "sources:update": (message) => {
    if (message.type !== 'sources:update') {
      return;
    }

    store.get(StoreSliceId.Sources).upsert(message.sources);
  },

  "status:error": (message) => {
    if (message.type !== 'status:error') {
      return;
    }

    console.error('WebviewHost reported an error:', message.message);
  },

  "session:start": (message) => {
    if (message.type !== 'session:start') {
      return;
    }

    store.get(StoreSliceId.View).setMode(message.viewMode);
    // Loading defaults
    store.get(StoreSliceId.Decode).setOptions(message.decodeOptions);
  },

  export: (message) => {
    if (message.type !== 'export') {
      return;
    }

    return exportSelected(store, bridge);
  },
});
