import type { AppStore } from '../store/types';
import type { WebviewMessage } from '../webviewHost/types';

export interface MessagePoster {
  postToWebviewHost(message: WebviewMessage): void;
};

export type ResolverContext = {
  readonly bridge: MessagePoster;
};

export type WebviewResolverContext = ResolverContext & {
  readonly store: AppStore;
};

export type MessageLike = { readonly type: string };

export type MessageResolver<
  TMessage extends MessageLike,
  TContext extends ResolverContext = WebviewResolverContext,
  K extends TMessage['type'] = TMessage['type'],
> = (
  message: Extract<TMessage, { type: K }>,
  context: TContext,
) => void | Promise<void>;

export type MessageResolverMap<
  TMessage extends MessageLike,
  TContext extends ResolverContext = WebviewResolverContext,
> = {
  readonly [K in TMessage['type']]?: MessageResolver<TMessage, TContext, K>;
};
