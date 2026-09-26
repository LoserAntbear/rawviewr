import type { WebviewHostMessage, WebviewHostMessageType } from '../types';

export type WebviewHostMessageResolver<
  TMessageType extends WebviewHostMessageType = WebviewHostMessageType,
  TMessage = TMessageType extends WebviewHostMessage["type"] ? Extract<WebviewHostMessage, { type: TMessageType }> : never
> = (message: TMessage) => Promise<void> | void;
export type WebviewHostMessageResolverMap<TKey extends WebviewHostMessageType = WebviewHostMessageType> = {
  [K in TKey]: WebviewHostMessageResolver<K>;
}
