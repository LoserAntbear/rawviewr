
import { RIVTags } from '../definitions';
import { RIVHTMLElement } from '../RIVHTMLElement';

import styles from './index.css';
import template from './index.html';

export class RIVAppComponent extends RIVHTMLElement {
  public static readonly tagName = RIVTags.App;

  constructor() {
    super();

    this.mount(template, styles);
  }

  public connectedCallback(): void {
    // The host waits for this before sending the session and its sources.
    this.emitCommand({ type: 'app:ready' });
  }
}
