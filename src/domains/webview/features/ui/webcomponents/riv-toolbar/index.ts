import { StoreSliceId } from '@WEBVIEW/features/store/definitions';
import { STORE_SELECTORS } from '@WEBVIEW/features/store/selectors';
import { ImageItem } from '@WEBVIEW/features/store/slice/ImagesSlice';
import type { AppStoreState } from '@WEBVIEW/features/store/types';
import { WebviewContextProvider } from '@WEBVIEW/features/webviewContext/WebviewContextProvider';

import { RIVTags } from '../definitions';
import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVViewState } from '../RIVViewState';

import { getControlForElement, respondsTo } from './controls/utils';
import { readElementValue } from './ElementBuilder/utils';
import styles from './index.css';
import template from './index.html';
import { RIVToolbarView } from './RIVToolbarView';
import { EMPTY_TOOLBAR_STATE, ToolbarStateTransition } from './state/definitions';
import { TOOLBAR_STATE_HANDLERS } from './state/handlers';
import type { ToolbarState, ToolbarSyncPayload, ToolbarTransitionPayloads } from './state/types';

function resolveAvailableBytes(state: AppStoreState): number {
  const item = STORE_SELECTORS.displayedItem(state);

  return ImageItem.isDecoded(item) ? item.geometry.availableBytes : 0;
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

    this.disposableStore.add(WebviewContextProvider.context.store.subscribe(
      this.readSync.bind(this),
      this.render.bind(this),
    ));
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

  private readSync(state: AppStoreState): ToolbarSyncPayload {
    return {
      zoom: state[StoreSliceId.View].zoom,
      options: state[StoreSliceId.DecodeOptions],
      availableBytes: resolveAvailableBytes(state),
      background: state[StoreSliceId.View].background,
      preserveOptions: state[StoreSliceId.Config].preserveOptionsForAllWindows,
    };
  }

  private render(sync: ToolbarSyncPayload): void {
    this.view.render(this.viewState.updateState(ToolbarStateTransition.Synced, sync));
  }
}
