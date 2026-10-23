import { attemptDetached } from '@utils/attempt';

import type{ WebviewDisposable } from '../disposable';

import type { MessageLike, MessagePoster, MessageResolverMap, ResolverContext } from './types';

// Have to force-type the union of resolvers,
// because their parameters are contravariant
type ResolverInvariant<TMessage, TContext> =
  | ((message: TMessage, context: TContext) => void | Promise<void>)
  | undefined;

export abstract class MessageDispatcher<
  TMessage extends MessageLike,
  TContext extends object = object,
> {
  protected abstract get channelId(): string;

  protected readonly context: ResolverContext<TMessage> & TContext;

  constructor(
    private readonly resolvers: MessageResolverMap<TMessage, ResolverContext<TMessage> & TContext>,
    bridge: MessagePoster<TMessage>,
    extra: TContext = {} as TContext,
  ) {
    this.context = { bridge, ...extra } as ResolverContext<TMessage> & TContext;
  }

  // WARNING: Do not forget to dispose!
  public abstract listen(target?: EventTarget): WebviewDisposable;

  public dispatch(message: TMessage): void {
    const resolver = this.resolvers[message.type as TMessage['type']] as ResolverInvariant<TMessage, TContext>;

    attemptDetached(
      () => {
        if (!resolver) {
          throw new Error(`${this.channelId}: nothing resolves "${message.type}".`);
        }

        return resolver(message, this.context);
      },
      (error) => this.reportFailure(message.type, error),
    );
  }

  protected reportFailure(type: string, error: unknown): void {
    console.error(`${this.channelId}: "${type}" failed:`, error);
  }
}
