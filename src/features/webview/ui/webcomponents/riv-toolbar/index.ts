import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';
import { StoreSliceId } from '@features/webview/store/definitions';
import { isReadyImageItem } from '@features/webview/store/slice/ImagesSlice';
import type { AppStore } from '@features/webview/store/types';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVViewState } from '../RIVViewState';
import { RIVTags } from '../definitions';
import { RIVToolbarView } from './RIVToolbarView';
import template from './index.html';
import styles from './index.css';
import { getControlForElement, respondsTo } from './controls/utils';
import { readElementValue } from './ElementBuilder/utils';
import { ToolbarState, ToolbarTransitionPayloads } from './state/types';
import { EMPTY_TOOLBAR_STATE, ToolbarStateTransition } from './state/definitions';
import { TOOLBAR_STATE_HANDLERS } from './state/handlers';

function resolveAvailableBytes(store: AppStore): number {
  const item = store.selectors.displayedItem();

  return item && isReadyImageItem(item) ? item.geometry.availableBytes : 0;
}

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

    // Both interactions, one handler: the control table says which one each answers to.
    this.observe(this.view.rootRef, 'change', this.handleControlInteraction.bind(this));
    this.observe(this.view.rootRef, 'click', this.handleControlInteraction.bind(this));
    // Decode options fill the fields; the view's zoom decides which zoom buttons still bite.
    this.observe(
      WebviewContextProvider.context.store.bus,
      "decodeOptions:change",
      this.sync.bind(this),
    );
    this.observe(
      WebviewContextProvider.context.store.bus,
      "view:change",
      this.sync.bind(this),
    );
    // The candidates are derived from the image on show, so they move when it does.
    this.observe(
      WebviewContextProvider.context.store.bus,
      "images:change",
      this.sync.bind(this),
    );

    this.sync();
  }

  private handleControlInteraction(event: Event): void {
    const control = getControlForElement(event.target);

    if (!control || !respondsTo(control, event.type)) {
      return;
    }

    this.emitCommand(control.toCommand(
      readElementValue(event.target as HTMLElement),
      { formats: WebviewContextProvider.context.formatRegistry },
    ));
  }

  private sync(): void {
    const { store } = WebviewContextProvider.context;

    this.view.render(
      this.viewState.updateState(ToolbarStateTransition.Synced, {
        zoom: store.get(StoreSliceId.View).zoom,
        availableBytes: resolveAvailableBytes(store),
        background: store.get(StoreSliceId.View).background,
        options: store.get(StoreSliceId.DecodeOptions).options,
      }),
    );
  }
}
