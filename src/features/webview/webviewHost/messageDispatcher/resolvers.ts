import { exportSelected } from '../../image/export/exportSelected';
import { StoreSliceId } from '../../store/definitions';
import { SnapshotValidator } from '@features/settings/snapshot';

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
    store.get(StoreSliceId.View).setBackground(message.background);
    store.get(StoreSliceId.DecodeOptions).setOptions(message.decodeOptions);
  },

  export: (_message, { store, bridge }) => {
    return exportSelected(store, bridge);
  },

  "images:decode:ready": (message, { store }) => {
    store.get(StoreSliceId.Images).upsert(message.images);
  },

  "probe:receive:source-bytes": ({ id, location, result }, { store }) => {
    store.get(StoreSliceId.Probe).setSourceBytesForPinnedSample(id, location, result);
  },

  "view:config:update": ({ config }, { store }) => {
    store.get(StoreSliceId.Config).setConfiguration(config);
  },

  "decode:options:preserved": ({ snapshot }, { store }) => {
    store.get(StoreSliceId.Config).setPreserveOptionsForAllWindows(snapshot.preserved);

    if (snapshot.preserved && !SnapshotValidator.areSameOptions(store.get(StoreSliceId.DecodeOptions).options, snapshot.options)) {
      store.get(StoreSliceId.DecodeOptions).setOptions(snapshot.options);
    }
  },

  // Basically a keystroke redirected through the host.
  "view:zoom": ({ direction }, { store }) => {
    store.get(StoreSliceId.View).setZoom(direction);
  },
};
