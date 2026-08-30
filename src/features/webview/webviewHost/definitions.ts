import type { WebviewHostMessageResolverMap } from './messageDispatcher';

export const WEBVIEW_HOST_MESSAGE_RESOLVERS = (): WebviewHostMessageResolverMap => ({
  items: (message) => {
    console.log('WEBVIEW_HOST_MESSAGE_RESOLVERS: Handling items message:', message);
  },
  error: (message) => {
    console.log('WEBVIEW_HOST_MESSAGE_RESOLVERS: Handling error message:', message);
    // Handle the 'error' message from the webview if needed
  }
});
