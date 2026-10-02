import { exportSelected } from '../../image/export/exportSelected';
import { StoreSliceId } from '../../store/definitions';

import type { WebviewHostMessageResolverMap } from './types';

export const WEBVIEW_HOST_MESSAGE_RESOLVERS: Required<WebviewHostMessageResolverMap> = {
  "sources:update": (message, { store }) => {
    store.get(StoreSliceId.Sources).upsert(message.sources);
  },

  "status:error": (message) => {
    console.error('WebviewHost reported an error:', message.message);
  },

  "session:start": (message, { store }) => {
    store.get(StoreSliceId.View).setMode(message.viewMode);
    store.get(StoreSliceId.DecodeOptions).setOptions(message.decodeOptions);
  },

  export: (_message, { store, bridge }) => {
    return exportSelected(store, bridge);
  },

  "images:decode:ready": (message, { store }) => {
    store.get(StoreSliceId.Images).upsert(message.images);
  },

  // Basically a keystroke redirected through the host.
  "view:zoom": ({ direction }, { store }) => {
    store.get(StoreSliceId.View).setZoom(direction);
  },
};
