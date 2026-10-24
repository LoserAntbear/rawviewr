import type { EventMap } from './TypedEventTarget';

export type MessagePoster<TMessage> = {
  post(message: TMessage): Promise<void>;
};

export type ResolverContext<TMessage, TBridge extends MessagePoster<TMessage> = MessagePoster<TMessage>> = {
  readonly bridge: TBridge;
};

export type MessageLike = { readonly type: string };

export type MessageForward<
  TDetail,
  TMessage,
  TContext extends object = ResolverContext<TMessage>,
> = (
  detail: TDetail,
  context: TContext,
) => TMessage | null;
export type MessageForwardMap<
  TMessage,
  TEvents extends EventMap,
  TContext extends object = ResolverContext<TMessage>,
> = {
  readonly [K in keyof TEvents & string]?: MessageForward<TEvents[K], TMessage, TContext>;
};

export type MessageResolver<
  TMessage extends MessageLike,
  TContext extends object = ResolverContext<TMessage>,
  K extends TMessage['type'] = TMessage['type'],
> = (
  message: Extract<TMessage, { type: K }>,
  context: TContext,
) => void | Promise<void>;

export type MessageResolverMap<
  TMessage extends MessageLike,
  TContext extends object = ResolverContext<TMessage>,
> = {
  readonly [K in TMessage['type']]?: MessageResolver<TMessage, TContext, K>;
};
