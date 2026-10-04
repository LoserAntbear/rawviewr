import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import template from './index.html';
import styles from './index.css';
import { WheelInputHandler } from '@features/webview/_features/input/wheelInput/WheelInputHandler';

export class RIVMainView extends RIVHTMLElement {
  public static readonly tagName = RIVTags.MainView;

  private wheelInputHandler = new WheelInputHandler(this);

  constructor() {
    super();

    this.mount(template, styles);

  }

  public connectedCallback(): void {
    const viewport = this.ref('main-view');

    if (!viewport) {
      throw new Error(`${this.localName}: template is missing #main-view`);
    }

    // Not passive: the gesture has to be taken off Chromium, which would zoom the page.
    this.observe(viewport, 'wheel', this.wheelInputHandler.handleWheelAsZoom.bind(this.wheelInputHandler), { passive: false });
  }
}
