import type { MessageResolver, MessageResolverMap, WebviewResolverContext } from '../messaging';
import type { WebviewMessage, WebviewMessageType } from '../webviewHost/types';

export type WebviewCommandResolver<K extends WebviewMessageType = WebviewMessageType> =
  MessageResolver<WebviewMessage, WebviewResolverContext, K>;

/** Partial on purpose: `export:png` and `app:status` are posted from code, never raised. */
export type WebviewCommandResolversMap = MessageResolverMap<WebviewMessage, WebviewResolverContext>;
