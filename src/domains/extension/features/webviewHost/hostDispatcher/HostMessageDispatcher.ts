import type { WebviewDisposable } from '@SHARED/features/disposable/types';
import { MessageDispatcher } from '@SHARED/features/messaging';
import type { WebviewHostMessage, WebviewMessage } from '@SHARED/features/messaging/protocol';

import type { HostMessageBridge } from '../bridge';

import type { HostMessageResolverInjectedContext } from './types';

export class HostMessageDispatcher extends MessageDispatcher<
  WebviewHostMessage,
  HostMessageResolverInjectedContext,
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
