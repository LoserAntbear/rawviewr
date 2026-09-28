import { attemptDetached } from '@utils/attempt';
import type { WebviewCommandResolversMap, WebviewCommandResolver } from './types';
import type { WebviewMessage } from '../webviewHost/types';
import { RIV_COMMAND_EVENT_ID } from './definitions';
import { listenTo } from '../disposable/listenTo';
import type { WebviewDisposable } from '../disposable/types';

export class WebviewCommandDispatcher {
  constructor(
    private readonly resolvers: WebviewCommandResolversMap,
  ) {}

  public dispatch(message: WebviewMessage): void {
    const resolver = this.resolvers[message.type] as WebviewCommandResolver | undefined;

    attemptDetached(
      () => {
        if (!resolver) {
          throw new Error(`No resolver for command "${message.type}".`);
        }

        return resolver(message);
      },
      (error) => console.error(`Command "${message.type}" failed:`, error),
    );
  }

  /**
   * Do not forget to dispose to detach listener
   */
  public listen(target: EventTarget): WebviewDisposable {
    return listenTo(target, RIV_COMMAND_EVENT_ID, (event: Event) => {
      this.dispatch((event as CustomEvent<WebviewMessage>).detail);
    });
  }
}
