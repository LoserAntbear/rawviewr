import { WebviewCommandKind } from '@features/webview/commands/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';

export class RIVImage extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Image;

  public connectedCallback(): void {
    this.emitCommand({
      kind: WebviewCommandKind.Connected,
      payload: RIVImage.tagName,
    });
  }
}
