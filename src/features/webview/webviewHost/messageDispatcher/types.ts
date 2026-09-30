import type { MessageResolver, MessageResolverMap, WebviewResolverContext } from '../../messaging';
import type { WebviewHostMessage, WebviewHostMessageType } from '../types';

export type WebviewHostMessageResolver<K extends WebviewHostMessageType = WebviewHostMessageType> =
  MessageResolver<WebviewHostMessage, WebviewResolverContext, K>;

/** `Required` at the table: everything the host can send has to be answered. */
export type WebviewHostMessageResolverMap = MessageResolverMap<WebviewHostMessage, WebviewResolverContext>;
