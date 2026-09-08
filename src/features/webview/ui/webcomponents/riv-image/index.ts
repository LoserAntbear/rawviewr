import { WebviewCommandType } from '@features/webview/commands/definitions';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';
import { StoreEvent } from '@features/webview/store/definitions';
import type { StoreChangeEvent } from '@features/webview/store/types';
import type { ItemsState } from '@features/webview/store/slice/ItemsSlice';
import { isAbortError } from '@guards/errorGuards';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import { RIVViewState } from '../RIVViewState';
import { RIVImageStateKind, RIVImageStateTransition } from './definitions';
import { RIVImageView } from './RIVImageView';
import {
  INITIAL_IMAGE_STATE,
  RIV_IMAGE_STATE_HANDLERS,
} from './RivImageState';
import type {
  RIVImageRenderer,
  RIVImageRendererMap,
  RIVImageState,
  RIVImageTransitionPayloads,
} from './types';
import template from './index.html';
import styles from './index.css';

export class RIVImage extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Image;
  public static readonly observedAttributes = ['item-id'];

  public get itemId(): string {
    return this.getAttribute('item-id') ?? '';
  }

  public set itemId(value: string) {
    this.setAttribute('item-id', value);
  }

  protected readonly view = new RIVImageView(this.mount(template, styles));

  private readonly renderers: RIVImageRendererMap = {
    [RIVImageStateKind.Loading]: () => this.view.showStatus('loading…'),
    [RIVImageStateKind.Empty]: () => this.view.showStatus('nothing to decode'),
    [RIVImageStateKind.Error]: ({ message }) => this.view.showStatus(message, 'error'),
    [RIVImageStateKind.Painted]: ({ bitmap }) => this.view.paint(bitmap),
  };

  /**
   * The state is held rather than recomputed per render, so a transition can compare
   * against what is already on screen — which is what lets a failure keep its caption
   * and what makes bitmap retirement a single, well-defined moment.
   */
  protected readonly viewState = new RIVViewState<
    RIVImageStateKind,
    RIVImageState,
    RIVImageTransitionPayloads
  >(INITIAL_IMAGE_STATE, RIV_IMAGE_STATE_HANDLERS);

  // Decode is async, so we need to manage aborting previous renders.
  private renderAsyncController?: AbortController;

  public connectedCallback(): void {
    if (!this.itemId) {
      throw new Error(`${this.localName}: mounted without an itemId`);
    }

    const { store } = WebviewContextProvider.context;

    this.observe(store.bus, StoreEvent.ItemsChange, this.handleItemsChange.bind(this));
    this.observe(store.bus, StoreEvent.DecodeChange, this.render.bind(this));

    this.render();

    this.emitCommand({
      type: WebviewCommandType.Connected,
      payload: RIVImage.tagName,
    });
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();

    this.renderAsyncController?.abort();

    this.viewState.updateState(RIVImageStateTransition.CloseBitmap, {});
  }

  // Currently I have to traverse the entire items state to determine if this particular image needs to re-render.
  // FIXME: Optimize this by having the store emit more granular events or by indexing items by ID.
  private handleItemsChange(event: Event): void {
    const { prev, next } = (event as StoreChangeEvent<ItemsState>).detail;

    if (prev.byId.get(this.itemId) !== next.byId.get(this.itemId)) {
      this.render();
    }
  }

  private render(): void {
    this.renderAsyncController?.abort();
    this.renderAsyncController = new AbortController();

    void this.runRender(this.renderAsyncController.signal);
  }

  private async runRender(signal: AbortSignal): Promise<void> {
    const { store } = WebviewContextProvider.context;
    const item = store.getItem(this.itemId);

    if (!item) {
      return;
    }

    try {
      const bitmap = await store.decode.decode(item, signal);

      // A newer render started while this decode was finishing
      if (signal.aborted) {
        bitmap?.close();

        return;
      }

      this.commitRender(RIVImageStateTransition.Resolved, { item, bitmap });
    } catch (error) {
      // I'm already handling aborts, so any other error is treated as unexpected.
      if (isAbortError(error) || signal.aborted) {
        return;
      }

      console.error(`${this.localName}: render failed`, error);

      this.commitRender(RIVImageStateTransition.Failed, { item, error });
    }
  }

  // Render based on the updated state.
  private commitRender<K extends RIVImageStateTransition>(
    transition: K,
    payload: RIVImageTransitionPayloads[K],
  ): void {
    this.renderState(this.viewState.updateState(transition, payload));
  }

  private renderState(state: RIVImageState): void {
    this.view.renderCaption(state.caption);

    const renderer = this.renderers[state.kind] as RIVImageRenderer;

    renderer(state);
  }
}
