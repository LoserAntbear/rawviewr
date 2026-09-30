import { MessageDispatcher } from '../messaging';
import type { WebviewMessage } from '../webviewHost/types';
import { RIV_COMMAND_EVENT_ID } from './definitions';
import { listenTo } from '../disposable/listenTo';
import type { WebviewDisposable } from '../disposable/types';

/** Messages the webview raises on its own DOM, as `riv:command` events. */
export class WebviewCommandDispatcher extends MessageDispatcher<WebviewMessage> {
  protected get channelId(): string {
    return 'Command';
  }

  public listen(target: EventTarget = document): WebviewDisposable {
    return listenTo(target, RIV_COMMAND_EVENT_ID, (event: Event) => {
      this.dispatch((event as CustomEvent<WebviewMessage>).detail);
    });
  }
}
