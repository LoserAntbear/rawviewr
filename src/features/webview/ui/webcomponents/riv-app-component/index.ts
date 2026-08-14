import { WebviewCommandKind } from '@features/webview/commands/definitions';
import { RIVHTMLElement } from '../RIVHTMLElement';

export class RIVAppComponent extends RIVHTMLElement {
  // TODO: Move tagnames to an enum?
  public static readonly tagName = 'riv-app-component';

  public connectedCallback(): void {
    this.emitCommand({
      kind: WebviewCommandKind.Connected,
      payload: RIVAppComponent.tagName,
    });
  }
}
