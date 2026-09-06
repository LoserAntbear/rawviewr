import { WebviewCommandType } from '@features/webview/commands/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import template from './index.html';
import styles from './index.css';

export class RIVMainView extends RIVHTMLElement {
  public static readonly tagName = RIVTags.MainView;

  constructor() {
    super();

    this.mount(template, styles);
  }

  public connectedCallback(): void {
    this.emitCommand({
      type: WebviewCommandType.Connected,
      payload: RIVMainView.tagName,
    });
  }
}
