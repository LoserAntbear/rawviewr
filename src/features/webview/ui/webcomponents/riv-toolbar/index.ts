import { WebviewCommandType } from '@features/webview/commands/definitions';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';
import { StoreEvent, StoreSliceId } from '@features/webview/store/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVViewState } from '../RIVViewState';
import { RIVTags } from '../definitions';
import { RIVToolbarView } from './RIVToolbarView';
import template from './index.html';
import styles from './index.css';
import { getControlDefinitionForElement } from './controls/utils';
import { readElementValue } from './ElementBuilder/utils';
import { ToolbarState, ToolbarTransitionPayloads } from './state/types';
import { EMPTY_TOOLBAR_STATE, ToolbarStateTransition } from './state/definitions';
import { TOOLBAR_STATE_HANDLERS } from './state/handlers';

export class RIVToolbar extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Toolbar;

  protected readonly view = new RIVToolbarView(this.mount(template, styles));
  protected readonly viewState = new RIVViewState<
    ToolbarStateTransition,
    ToolbarState,
    ToolbarTransitionPayloads
  >(EMPTY_TOOLBAR_STATE, TOOLBAR_STATE_HANDLERS);

  public connectedCallback(): void {
    this.view.build();

    this.observe(this.view.rootRef, 'change', this.handleControlChange.bind(this));
    this.observe(
      WebviewContextProvider.context.store.bus,
      StoreEvent.DecodeChange,
      this.sync.bind(this),
    );

    this.sync();

    this.emitCommand({
      type: WebviewCommandType.WebviewConnected,
      payload: RIVToolbar.tagName,
    });
  }

  private handleControlChange(event: Event): void {
    const value = readElementValue(event.target as HTMLElement);
    const control = getControlDefinitionForElement(event.target as HTMLElement);

    if (!control) {
      return;
    }

    WebviewContextProvider.context.store
      .get(StoreSliceId.Decode)
      .setOptions(control.toDecodeOptions(value));
  }

  private sync(): void {
    const { store, formatRegistry } = WebviewContextProvider.context;
    const options = store.get(StoreSliceId.Decode).options;

    this.view.render(
      this.viewState.updateState(ToolbarStateTransition.Synced, { options, formatRegistry }),
    );
  }
}
