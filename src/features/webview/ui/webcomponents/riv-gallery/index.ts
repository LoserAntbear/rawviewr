import { WebviewCommandType } from '@features/webview/commands/definitions';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';
import { StoreEvent, StoreSliceId } from '@features/webview/store/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import { RIVGalleryView } from './RIVGalleryView';
import { resolveGalleryState } from './state/resolvers';
import template from './index.html';
import styles from './index.css';

export class RIVGallery extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Gallery;

  protected readonly view = new RIVGalleryView(this.mount(template, styles));

  public connectedCallback(): void {
    const { store } = WebviewContextProvider.context;

    // Membership and order come from items; mode and selection from view. `visibleIds`
    // is derived from both, so both have to re-render it.
    this.observe(store.bus, StoreEvent.SourcesChange, this.render.bind(this));
    this.observe(store.bus, StoreEvent.ViewChange, this.render.bind(this));

    this.observe(this.view.rootRef, 'click', this.handleClick.bind(this));
    this.observe(this.view.rootRef, 'dblclick', this.handleDoubleClick.bind(this));

    // Items may already be in the store by now — paint from current state, don't just listen.
    this.render();

    this.emitCommand({
      type: WebviewCommandType.WebviewConnected,
      payload: RIVGallery.tagName,
    });
  }

  private handleClick(event: Event): void {
    const id = this.view.entryIdFor(event.target);

    if (id !== undefined) {
      WebviewContextProvider.context.store.get(StoreSliceId.View).select(id);
    }
  }

  private handleDoubleClick(event: Event): void {
    const id = this.view.entryIdFor(event.target);

    if (id !== undefined) {
      this.emitCommand({ type: WebviewCommandType.GalleryOpenItem, payload: id });
    }
  }

  private render(): void {
    this.view.render(resolveGalleryState(WebviewContextProvider.context.store.state));
  }
}
