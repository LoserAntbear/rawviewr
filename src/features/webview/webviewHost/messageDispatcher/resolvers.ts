import { SnapshotValidator } from '@features/settings/snapshot';

import { StoreSliceId } from '../../store/definitions';

import type { WebviewHostMessageResolverMap } from './types';

export const WEBVIEW_HOST_MESSAGE_RESOLVERS: Required<WebviewHostMessageResolverMap> = {
  'sources:update': (message, { store }) => {
    store.get(StoreSliceId.Sources).upsert(message.sources);
  },

  'status:error': (message) => {
    console.error('WebviewHost reported an error:', message.message);
  },

  'session:start': (message, { store }) => {
    store.get(StoreSliceId.View).setMode(message.viewMode);
    store.get(StoreSliceId.View).setBackground(message.background);
    store.get(StoreSliceId.DecodeOptions).setOptions(message.decodeOptions);
  },

  'images:decode:ready': (message, { store }) => {
    store.get(StoreSliceId.Images).upsert(message.images);
  },

  'probe:receive:source-bytes': ({ id, location, result }, { store }) => {
    store.get(StoreSliceId.Probe).setSourceBytesForPinnedSample(id, location, result);
  },

  'view:config:update': ({ config }, { store }) => {
    store.get(StoreSliceId.Config).setConfiguration(config);
  },

  'decode:options:preserved': ({ snapshot }, { store }) => {
    const decodeOptions = store.get(StoreSliceId.DecodeOptions);

    store.get(StoreSliceId.Config).setPreserveOptionsForAllWindows(snapshot.preserved);

    if (snapshot.preserved && !SnapshotValidator.areSameOptions(decodeOptions.options, snapshot.options)) {
      decodeOptions.setOptions(snapshot.options);
    }
  },

  // Basically a keystroke redirected through the host.
  'view:zoom': ({ direction }, { store }) => {
    store.get(StoreSliceId.View).setZoom(direction);
  },
};
