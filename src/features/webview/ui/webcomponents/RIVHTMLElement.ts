import type { WebviewCommand } from '../../commands/types';
import { RIV_COMMAND_EVENT_ID } from '../../commands/definitions';
import { WebviewDisposableStore } from '../../disposable/WebviewDisposableStore';

export abstract class RIVHTMLElement extends HTMLElement {
  public static readonly tagName: string;
  protected readonly disposableStore = new WebviewDisposableStore();

  public disconnectedCallback(): void {
    this.disposableStore.dispose();
  }

  protected emitCommand(command: WebviewCommand): void {
    this.dispatchEvent(
      new CustomEvent<WebviewCommand>(RIV_COMMAND_EVENT_ID, {
        bubbles: true,
        composed: true, // To allow the event to cross shadow DOM boundaries
        detail: command,
      }),
    );
  }
}
