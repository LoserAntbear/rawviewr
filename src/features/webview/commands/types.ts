import type { MessageResolver, MessageResolverMap } from '../messaging';
import type { WebviewMessage, WebviewMessageType } from '../webviewHost/types';

export type WebviewCommandResolver<K extends WebviewMessageType = WebviewMessageType> =
  MessageResolver<WebviewMessage, K>;
export type WebviewCommandResolversMap = MessageResolverMap<WebviewMessage>;
