import type { WebviewCommand, WebviewCommandResolversMap, WebviewCommandResolver } from './types';
import { RIV_COMMAND_EVENT_ID } from './definitions';
import { listenTo } from '../disposable/listenTo';
import type { WebviewDisposable } from '../disposable/types';

export class WebViewCommandDispatcher {
  constructor(
    private readonly resolvers: WebviewCommandResolversMap,
  ) {}

  public dispatch(command: WebviewCommand): void {
    const resolver = this.resolvers[command.kind] as WebviewCommandResolver;

    resolver(command);
  }

  /**
   * Do not forget to dispose to detach listener
   */
  public listen(target: EventTarget): WebviewDisposable {
    return listenTo(target, RIV_COMMAND_EVENT_ID, (event: Event) => {
      this.dispatch((event as CustomEvent<WebviewCommand>).detail);
    });
  }
}
