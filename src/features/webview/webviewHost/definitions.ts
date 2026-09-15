import { encodeBitmapToPngBase64 } from '../image/encodePng';
import type { WebviewSessionCommunicationBridge } from '../session/WebviewSessionCommunicationBridge';
import { StoreSliceId } from '../store/definitions';
import type { AppStore } from '../store/types';
import type { WebviewHostMessageResolverMap } from './messageDispatcher';

/**
 * Encodes whatever is currently selected.
 *
 * Decodes for itself rather than lifting pixels off `riv-image`'s canvas: the store is
 * the source of truth for both the bytes and the options, and reaching into a component
 * for its DOM would be exactly the leaf-to-leaf coupling the component split avoids.
 */
async function exportSelected(store: AppStore, bridge: WebviewSessionCommunicationBridge): Promise<void> {
  const [id] = store.selectors.visibleIds();
  const item = id === undefined ? undefined : store.get(StoreSliceId.Items).getItem(id);

  if (!item) {
    bridge.postToWebviewHost({
      type: 'app:status',
      level: 'warn',
      message: 'Raw Image Viewer: nothing to export.',
    });

    return;
  }

  const bitmap = await store.get(StoreSliceId.Decode).decode(item);

  if (!bitmap) {
    bridge.postToWebviewHost({
      type: 'app:status',
      level: 'error',
      message: `Raw Image Viewer: ${item.name} has nothing decodable in it.`,
    });

    return;
  }

  try {
    bridge.postToWebviewHost({
      type: 'export:png',
      name: `${item.name}.png`,
      base64: await encodeBitmapToPngBase64(bitmap),
    });
  } finally {
    // The canvas took its own copy; these pixels are off-heap.
    bitmap.close();
  }
}

export const WEBVIEW_HOST_MESSAGE_RESOLVERS = (
  store: AppStore,
  bridge: WebviewSessionCommunicationBridge,
): WebviewHostMessageResolverMap => ({
  items: (message) => {
    if (message.type !== 'items') {
      return;
    }

    store.get(StoreSliceId.Items).upsert(message.items);
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
