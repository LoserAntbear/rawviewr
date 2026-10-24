import type { MessageResolver, MessageResolverMap } from '@SHARED/features/messaging';
import type { WebviewHostMessage, WebviewHostMessageType } from '@SHARED/features/messaging/protocol';
import type { WebviewResolverContext } from '@WEBVIEW/features/messaging';

export type WebviewHostMessageResolver<K extends WebviewHostMessageType = WebviewHostMessageType> =
  MessageResolver<WebviewHostMessage, WebviewResolverContext, K>;

export type WebviewHostMessageResolverMap = MessageResolverMap<WebviewHostMessage, WebviewResolverContext>;
