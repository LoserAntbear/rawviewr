import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';

import { RIVTags } from '../definitions';
import { RIVHTMLElement } from '../RIVHTMLElement';

import styles from './index.css';
import template from './index.html';
import { selectStatusBarContext } from './state/selectors';
import { RIVStatusBarView } from './view/RIVStatusBarView';
import { STATUS_SEGMENTS } from './view/segment/segments';

const STATUS_BAR_EVENTS = [
  'view:change',
  'probe:change',
  'images:change',
  'sources:change',
  'decodeOptions:change',
] as const;

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
  }

  private render(): void {
    const { store, formatRegistry } = WebviewContextProvider.context;

    this.view.render(selectStatusBarContext(store.state, formatRegistry));
  }
}
