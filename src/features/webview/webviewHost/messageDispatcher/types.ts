import type { MessageResolver, MessageResolverMap, WebviewResolverContext } from '../../messaging';
import type { WebviewHostMessage, WebviewHostMessageType } from '../types';

export type WebviewHostMessageResolver<K extends WebviewHostMessageType = WebviewHostMessageType> =
  MessageResolver<WebviewHostMessage, WebviewResolverContext<WebviewHostMessage>, K>;

export type WebviewHostMessageResolverMap = MessageResolverMap<
  WebviewHostMessage,
  WebviewResolverContext<WebviewHostMessage>
>;
