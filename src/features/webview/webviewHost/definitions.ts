import { ReactiveStore } from '../store/ReactiveStore';
import type { WebviewHostMessageResolverMap } from './messageDispatcher';

export const WEBVIEW_HOST_MESSAGE_RESOLVERS = (
  store: ReactiveStore,
): WebviewHostMessageResolverMap => ({
  items: (message) => {
    if (message.type !== 'items') {
      return;
    }

    console.log('WEBVIEW_HOST_MESSAGE_RESOLVERS: Handling items message:', message);

    store.addItems(message.items);
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

    store.setViewMode(message.viewMode);

    console.log('WEBVIEW_HOST_MESSAGE_RESOLVERS: Handling session message:', message);
    // Handle the 'session' message from the webview if needed
  },
});
