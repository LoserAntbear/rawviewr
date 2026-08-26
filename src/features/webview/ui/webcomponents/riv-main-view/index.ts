import { WebviewCommandKind } from '@features/webview/commands/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';

export class RIVMainView extends RIVHTMLElement {
  public static readonly tagName = RIVTags.MainView;

  public connectedCallback(): void {
    this.emitCommand({
      kind: WebviewCommandKind.Connected,
      payload: RIVMainView.tagName,
    });
  }
}
