import type { WebviewSessionCommunicationBridge } from '../session/WebviewSessionCommunicationBridge';
import type { AppStore } from '../store/types';

export type ResolverContext = {
  readonly store: AppStore;
  readonly bridge: WebviewSessionCommunicationBridge;
};
export type MessageLike = { readonly type: string };
export type MessageResolver<
  TMessage extends MessageLike,
  K extends TMessage['type'] = TMessage['type'],
> = (
  message: Extract<TMessage, { type: K }>,
  context: ResolverContext,
) => void | Promise<void>;

export type MessageResolverMap<TMessage extends MessageLike> = {
  readonly [K in TMessage['type']]?: MessageResolver<TMessage, K>;
};
