import { listenTo } from '@SHARED/features/disposable/listenTo';
import type { WebviewDisposable } from '@SHARED/features/disposable/types';
import { MessageDispatcher } from '@SHARED/features/messaging';
import type { WebviewMessage } from '@SHARED/features/messaging/protocol';

import type { AppStore } from '../store/types';

import { RIV_COMMAND_EVENT_ID } from './definitions';

/** Messages the webview raises on its own DOM, as `riv:command` events. */
export class WebviewCommandDispatcher extends MessageDispatcher<WebviewMessage, { store: AppStore }> {
  protected get channelId(): string {
    return 'Command';
  }

  public listen(target: EventTarget = document): WebviewDisposable {
    return listenTo(target, RIV_COMMAND_EVENT_ID, (event: Event) => {
      this.dispatch((event as CustomEvent<WebviewMessage>).detail);
    });
  }
}
