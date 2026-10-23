import type { WebviewDisposable } from '@features/webview/disposable/types';

import { MessageDispatcher } from '../../messaging';
import type { HostMessageBridge } from '../bridge';
import type { WebviewHostMessage, WebviewMessage } from '../types';

import type { HostResolverContext } from './types';

export class HostMessageDispatcher extends MessageDispatcher<
  WebviewHostMessage,
  HostResolverContext,
  HostMessageBridge,
  WebviewMessage
> {
  protected get channelId(): string {
    return 'WebviewHost';
  }

  public listen(): WebviewDisposable {
    return this.context.bridge.listen(this.dispatch.bind(this))
  }

  protected override reportFailure(type: string, error: unknown): void {
    super.reportFailure(type, error);

    this.context.messages.handleMessage({
      level: 'error',
      message: `Failed to handle "${type}": ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
