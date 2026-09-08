import type { WebviewCommand } from '../../commands/types';
import { RIV_COMMAND_EVENT_ID } from '../../commands/definitions';
import { WebviewDisposableStore } from '../../disposable/WebviewDisposableStore';
import { WebviewDisposableUtils } from '@features/webview/disposable';
import { StyleSheets } from '../styleSheets';
import { RIVView } from './RIVView';

export abstract class RIVHTMLElement extends HTMLElement {
  public static readonly tagName: string;

  protected readonly disposableStore = new WebviewDisposableStore();
  private view?: RIVView;

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

  // Just a convenience method to observe events and automatically manage their disposal.
  protected observe(...args: Parameters<typeof WebviewDisposableUtils.listenTo>): void {
    this.disposableStore.add(WebviewDisposableUtils.listenTo(...args));
  }

  // RIVView mount point
  protected mount(template: string, styles?: string): ShadowRoot {
    const templateElement = document.createElement('template');

    templateElement.innerHTML = template;

    const shadowRoot = this.attachShadow({ mode: 'open' });

    // Content, then style. So the first paint is already styled.
    if (styles) {
      StyleSheets.adoptStyleSheet(shadowRoot, styles);
    }

    shadowRoot.appendChild(document.importNode(templateElement.content, true));

    this.view = new RIVView(shadowRoot);

    return shadowRoot;
  }

  protected ref<T extends HTMLElement>(id: string): T | null {
    return this.view?.ref<T>(id) ?? null;
  }
}
