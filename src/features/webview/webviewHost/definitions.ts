import type { AppStore } from '../store/types';
import { StoreSliceId } from '../store/definitions';
import type { WebviewHostMessageResolverMap } from './messageDispatcher';

export const WEBVIEW_HOST_MESSAGE_RESOLVERS = (
  store: AppStore,
): WebviewHostMessageResolverMap => ({
  items: (message) => {
    if (message.type !== 'items') {
      return;
    }

    console.log('WEBVIEW_HOST_MESSAGE_RESOLVERS: Handling items message:', message);

    store.get(StoreSliceId.Items).upsert(message.items);
    // store
  },
  error: (message) => {
    console.log('WEBVIEW_HOST_MESSAGE_RESOLVERS: Handling error message:', message);
    // Handle the 'error' message from the webview if needed
  },
  session: (message) => {
    if (message.type !== 'session') {
      return;
    }

    store.get(StoreSliceId.View).setMode(message.viewMode);

    console.log('WEBVIEW_HOST_MESSAGE_RESOLVERS: Handling session message:', message);
    // Handle the 'session' message from the webview if needed
  },
});
