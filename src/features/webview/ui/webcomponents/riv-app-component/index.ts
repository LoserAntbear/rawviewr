import { WebviewCommandKind } from '@features/webview/commands/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';

export class RIVAppComponent extends RIVHTMLElement {
  public static readonly tagName = RIVTags.App;

  public connectedCallback(): void {
    this.emitCommand({
      kind: WebviewCommandKind.Connected,
      payload: RIVAppComponent.tagName,
    });
  }
}
