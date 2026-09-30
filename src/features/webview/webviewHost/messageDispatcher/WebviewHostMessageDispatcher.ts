import { MessageDispatcher } from '../../messaging';
import type { WebviewDisposable } from '../../disposable/types';
import type { WebviewHostMessage } from '../types';

export class WebviewHostMessageDispatcher extends MessageDispatcher<WebviewHostMessage> {
  protected get channelId(): string {
    return 'Host message';
  }

  public listen(target?: EventTarget): WebviewDisposable {
    return this.context.bridge.listenToWebviewHost((message) => this.dispatch(message), target);
  }
}
