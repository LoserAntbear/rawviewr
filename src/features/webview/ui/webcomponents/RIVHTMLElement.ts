import type { WebviewCommand } from '../../commands/types';
import { RIV_COMMAND_EVENT_ID } from '../../commands/definitions';
import { WebviewDisposableStore } from '../../disposable/WebviewDisposableStore';
import { nullishCoalesce } from '@utils/coalesce';

export abstract class RIVHTMLElement extends HTMLElement {
  public static readonly tagName: string;
  protected readonly disposableStore = new WebviewDisposableStore();

  protected readonly refs = new Map<string, HTMLElement>();

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

  protected mount(template: string): void {
    const templateElement = document.createElement('template');

    templateElement.innerHTML = template;

    this.attachShadow({ mode: 'open' })
      .appendChild(document.importNode(templateElement.content, true));
  }

  protected ref<T extends HTMLElement>(id: string): T | null {
    return nullishCoalesce(
      this.refs.get(id) as T ?? null,
      this.queryAndCacheRef<T>(id),
    ) as T | null;
  }

  protected queryAndCacheRef<T extends HTMLElement>(id: string): T | null {
    const refElement = this.shadowRoot?.getElementById(id) as T | null;

    if (refElement) {
      this.refs.set(id, refElement);
    }

    return refElement;
  }
}
