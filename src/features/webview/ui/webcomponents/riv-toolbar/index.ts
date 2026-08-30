import { WebviewCommandType } from '@features/webview/commands/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';

export class RIVToolbar extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Toolbar;

  public connectedCallback(): void {
    this.emitCommand({
      type: WebviewCommandType.Connected,
      payload: RIVToolbar.tagName,
    });
  }
}
