import { attemptDetached } from '@utils/attempt';

import type { WebviewDisposable } from '../disposable/types';
import type { MessageLike, MessageResolverMap, ResolverContext } from './types';

// Probably, context must be assembled inside the dispatcher, rather than passed in from outside.
export abstract class MessageDispatcher<TMessage extends MessageLike> {
  protected abstract get channelId(): string;

  constructor(
    private readonly resolvers: MessageResolverMap<TMessage>,
    protected readonly context: ResolverContext,
  ) {}

  public dispatch(message: TMessage): void {
    const resolver = this.resolvers[message.type as TMessage['type']];

    attemptDetached(
      () => {
        if (!resolver) {
          throw new Error(`${this.channelId}: nothing resolves "${message.type}".`);
        }

        //@ts-expect-error The resolver map is keyed by the discriminant, so the lookup always hands a resolver the shape it expects.
        return resolver(message, this.context);
      },
      (error) => console.error(`${this.channelId}: "${message.type}" failed:`, error),
    );
  }

  // WARNING: Do not forget to dispose to detach the listener!
  public abstract listen(target?: EventTarget): WebviewDisposable;
}
