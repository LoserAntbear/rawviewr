import type { AppStore } from '../store/types';

import type { EventMap } from './TypedEventTarget';

export type MessagePoster<TMessage> = {
  post(message: TMessage): void;
};

export type ResolverContext<TMessage> = {
  readonly bridge: MessagePoster<TMessage>;
};

export type WebviewResolverContext<TMessage> = ResolverContext<TMessage> & {
  readonly store: AppStore;
};

export type MessageLike = { readonly type: string };

export type MessageForward<
  TDetail,
  TMessage,
  TContext extends ResolverContext<TMessage> = WebviewResolverContext<TMessage>> = (
  detail: TDetail,
  context: TContext,
) => TMessage | null;
export type MessageForwardMap<
  TMessage,
  TEvents extends EventMap,
  TContext extends ResolverContext<TMessage> = WebviewResolverContext<TMessage>,
> = {
  readonly [K in keyof TEvents & string]?: MessageForward<TEvents[K], TMessage, TContext>;
};

export type MessageResolver<
  TMessage extends MessageLike,
  TContext extends ResolverContext<TMessage> = WebviewResolverContext<TMessage>,
  K extends TMessage['type'] = TMessage['type'],
> = (
  message: Extract<TMessage, { type: K }>,
  context: TContext,
) => void | Promise<void>;

export type MessageResolverMap<
  TMessage extends MessageLike,
  TContext extends ResolverContext<TMessage> = WebviewResolverContext<TMessage>,
> = {
  readonly [K in TMessage['type']]?: MessageResolver<TMessage, TContext, K>;
};
