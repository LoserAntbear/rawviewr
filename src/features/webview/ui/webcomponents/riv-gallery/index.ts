import { WebviewCommandType } from '@features/webview/commands/definitions';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';
import { StoreEvent, StoreSliceId } from '@features/webview/store/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import type { RIVImage } from '../riv-image';
import template from './index.html';
import styles from './index.css';

/**
 * TODO: Separate item handling (creation, rendering) from the main gallery component.
 */
export class RIVGallery extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Gallery;

  /** Keyed by item id, so a re-render never rebuilds a canvas that is already correct. */
  private readonly items = new Map<string, HTMLLIElement>();

  constructor() {
    super();

    this.mount(template, styles);
  }

  public connectedCallback(): void {
    const { store } = WebviewContextProvider.context;

    // Membership and order come from items; mode and selection from view. `visibleIds`
    // is derived from both, so both have to re-render it.
    this.observe(store.bus, StoreEvent.ItemsChange, this.render.bind(this));
    this.observe(store.bus, StoreEvent.ViewChange, this.render.bind(this));

    // Items may already be in the store by now — paint from current state, don't just listen.
    this.render();

    this.emitCommand({
      type: WebviewCommandType.Connected,
      payload: RIVGallery.tagName,
    });
  }

  private render(): void {
    const list = this.ref<HTMLUListElement>('gallery');

    if (!list) {
      return;
    }

    const { store } = WebviewContextProvider.context;
    const bufferItemIds = store.selectors.visibleIds();

    list.dataset.viewMode = store.get(StoreSliceId.View).mode;

    this.removeStaleEntries(bufferItemIds);

    bufferItemIds.forEach((id, index) => {
      const entry = this.items.get(id) ?? this.createEntries(id);

      // A no-op when the node already sits at that index.
      list.insertBefore(entry, list.children[index] ?? null);
    });
  }

  private removeStaleEntries(visible: readonly string[]): void {
    const keep = new Set(visible);

    for (const [id, entry] of this.items) {
      if (keep.has(id)) {
        continue;
      }

      entry.remove();
      this.items.delete(id);
    }
  }

  private createEntries(id: string): HTMLLIElement {
    const entry = document.createElement('li');
    const image = document.createElement(RIVTags.Image) as RIVImage;

    // Set before insertion: the child reads it in connectedCallback.
    image.itemId = id;
    entry.appendChild(image);

    this.items.set(id, entry);

    return entry;
  }
}
