import type { WebviewCommand } from '../../commands/types';

const RIV_COMMAND_EVENT_ID = 'riv:command';

export abstract class RIVHTMLElement extends HTMLElement {
  public static readonly tagName: string;

  protected emitCommand(command: WebviewCommand): void {
    this.dispatchEvent(
      new CustomEvent<WebviewCommand>(RIV_COMMAND_EVENT_ID, {
        bubbles: true,
        detail: command,
      }),
    );
  }
}
