import type { MessageResolver, MessageResolverMap } from '../../messaging';
import type { WebviewHostMessage, WebviewHostMessageType } from '../types';

export type WebviewHostMessageResolver<K extends WebviewHostMessageType = WebviewHostMessageType> =
  MessageResolver<WebviewHostMessage, K>;

export type WebviewHostMessageResolverMap = MessageResolverMap<WebviewHostMessage>;
