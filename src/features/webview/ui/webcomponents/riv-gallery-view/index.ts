import { WebviewCommandType } from '@features/webview/commands/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import template from './index.html';

export class RIVGalleryView extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Gallery;

  constructor() {
    super();

    this.mount(template);
  }

  public connectedCallback(): void {
    this.emitCommand({
      type: WebviewCommandType.Connected,
      payload: RIVGalleryView.tagName,
    });
  }
}
