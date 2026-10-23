import type { AppStore } from '../store/types';
import type { WebviewMessage } from '../webviewHost';

import type { EventMap } from './TypedEventTarget';

export type MessagePoster<TMessage> = {
  post(message: TMessage): Promise<void>;
};

export type ResolverContext<TMessage, TBridge extends MessagePoster<TMessage> = MessagePoster<TMessage>> = {
  readonly bridge: TBridge;
};

export type WebviewResolverContext<TMessage = WebviewMessage> = ResolverContext<TMessage> & {
  readonly store: AppStore;
};

export type MessageLike = { readonly type: string };

export type MessageForward<
  TDetail,
  TMessage,
  TContext extends object = WebviewResolverContext,
> = (
  detail: TDetail,
  context: TContext,
) => TMessage | null;
export type MessageForwardMap<
  TMessage,
  TEvents extends EventMap,
  TContext extends object = WebviewResolverContext,
> = {
  readonly [K in keyof TEvents & string]?: MessageForward<TEvents[K], TMessage, TContext>;
};

export type MessageResolver<
  TMessage extends MessageLike,
  TContext extends object = WebviewResolverContext,
  K extends TMessage['type'] = TMessage['type'],
> = (
  message: Extract<TMessage, { type: K }>,
  context: TContext,
) => void | Promise<void>;

export type MessageResolverMap<
  TMessage extends MessageLike,
  TContext extends object = WebviewResolverContext,
> = {
  readonly [K in TMessage['type']]?: MessageResolver<TMessage, TContext, K>;
};
