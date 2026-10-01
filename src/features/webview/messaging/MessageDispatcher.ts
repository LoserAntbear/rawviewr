import { attemptDetached } from '@utils/attempt';

import type { WebviewDisposable } from '../disposable/types';
import type { MessageLike, MessagePoster, MessageResolverMap, ResolverContext } from './types';

// Have to force-type the union of resolvers,
// because their parameters are contravariant
type ResolverInvariant<TMessage, TExtra extends object = object> =
  | ((message: TMessage, context: ResolverContext & TExtra) => void | Promise<void>)
  | undefined;

export abstract class MessageDispatcher<
  TMessage extends MessageLike,
  TExtra extends object = object,
> {
  protected abstract get channelId(): string;

  protected readonly context: ResolverContext & TExtra;

  constructor(
    private readonly resolvers: MessageResolverMap<TMessage, ResolverContext & TExtra>,
    bridge: MessagePoster,
    extra: TExtra = {} as TExtra,
  ) {
    this.context = { bridge, ...extra } as ResolverContext & TExtra;
  }

  public dispatch(message: TMessage): void {
    const resolver = this.resolvers[message.type as TMessage['type']] as ResolverInvariant<TMessage, TExtra>;

    attemptDetached(
      () => {
        if (!resolver) {
          throw new Error(`${this.channelId}: nothing resolves "${message.type}".`);
        }

        return resolver(message, this.context);
      },
      (error) => console.error(`${this.channelId}: "${message.type}" failed:`, error),
    );
  }

  // WARNING: Do not forget to dispose!
  public abstract listen(target?: EventTarget): WebviewDisposable;
}
