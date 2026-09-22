import { WebviewCommandType } from '@features/webview/commands/definitions';
import { StoreEvent } from '@features/webview/store/definitions';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import { RIVStatusBarView } from './view/RIVStatusBarView';
import template from './index.html';
import styles from './index.css';
import { STATUS_SEGMENTS } from './view/segment/segments';
import { selectStatusBarContext } from './state/selectors';

const STATUS_BAR_EVENTS = [StoreEvent.SourcesChange, StoreEvent.ViewChange, StoreEvent.DecodeOptionsChange] as const;

export class RIVStatusBar extends RIVHTMLElement {
  public static readonly tagName = RIVTags.StatusBar;

  protected readonly view = new RIVStatusBarView(this.mount(template, styles), STATUS_SEGMENTS);

  public connectedCallback(): void {
    const { store } = WebviewContextProvider.context;

    this.view.build();

    for (const event of STATUS_BAR_EVENTS) {
      this.observe(store.bus, event, this.render.bind(this));
    }

    this.render();

    this.emitCommand({
      type: WebviewCommandType.WebviewConnected,
      payload: RIVStatusBar.tagName,
    });
  }

  private render(): void {
    const { store, formatRegistry } = WebviewContextProvider.context;

    this.view.render(selectStatusBarContext(store.state, formatRegistry));
  }
}
