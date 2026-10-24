import type { MessageResolver, MessageResolverMap } from '@SHARED/features/messaging';
import type { WebviewMessage, WebviewMessageType } from '@SHARED/features/messaging/protocol';
import type { WebviewResolverContext } from '@WEBVIEW/features/messaging';

export type WebviewCommandResolver<K extends WebviewMessageType = WebviewMessageType> =
  MessageResolver<WebviewMessage, WebviewResolverContext<WebviewMessage>, K>;

/** Partial on purpose: `export:png` and `app:status` are posted from code, never raised. */
export type WebviewCommandResolversMap = MessageResolverMap<WebviewMessage, WebviewResolverContext<WebviewMessage>>;
