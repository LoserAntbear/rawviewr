import { WebviewMessage } from '@features/webview/webviewHost';
import { RIV_COMMAND_EVENT_ID } from '@webview/commands/definitions';
import { resolveWheelZoomDirection } from './utils';

export class WheelInputHandler {
  constructor(
    private readonly target: EventTarget
  ) {}

  public handleWheelAsZoom(event: Event): void {
    const wheel = event as WheelEvent;

    if (!wheel.ctrlKey && !wheel.metaKey) {
      return;
    }

    wheel.preventDefault();

    const direction = resolveWheelZoomDirection(wheel.deltaY);

    if (direction) {
      this.emitCommand({ type: 'view:zoom', direction });
    }
  }

  protected emitCommand(command: WebviewMessage): void {
    this.target.dispatchEvent(
      new CustomEvent<WebviewMessage>(RIV_COMMAND_EVENT_ID, {
        bubbles: true,
        composed: true, // To allow the event to cross shadow DOM boundaries
        detail: command,
      }),
    );
  }
}
