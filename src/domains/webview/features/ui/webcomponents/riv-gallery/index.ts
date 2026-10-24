import { ListVirtualizationObserver } from '@WEBVIEW/features/_features/listVirtualization/ListVirtualizationObserver';
import { StoreSliceId } from '@WEBVIEW/features/store/definitions';
import { WebviewContextProvider } from '@WEBVIEW/features/webviewContext/WebviewContextProvider';

import { RIVTags } from '../definitions';
import { RIVHTMLElement } from '../RIVHTMLElement';

import styles from './index.css';
import template from './index.html';
import { RIVGalleryView } from './RIVGalleryView';
import { resolveGalleryState } from './state/resolvers';

export class RIVGallery extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Gallery;

  protected readonly view = new RIVGalleryView(this.mount(template, styles));

  private readonly virtualizationObserver = new ListVirtualizationObserver(
    this,
    this.handleIntersection.bind(this),
  )

  public connectedCallback(): void {
    const { store } = WebviewContextProvider.context;

    this.observe(store.bus, 'sources:change', this.render.bind(this));
    this.observe(store.bus, 'view:change', this.render.bind(this));
    this.observe(store.bus, 'config:change', this.render.bind(this));

    this.observe(this.view.rootRef, 'click', this.handleClick.bind(this));
    this.observe(this.view.rootRef, 'dblclick', this.handleDoubleClick.bind(this));
    this.disposableStore.add(this.virtualizationObserver);

    // Items may already be in the store by now — paint from current state, don't just listen.
    this.render();
  }

  private handleClick(event: Event): void {
    const id = this.view.entryIdFor(event.target);

    if (id !== undefined) {
      WebviewContextProvider.context.store.get(StoreSliceId.Images).setSelected(id);
    }
  }

  private handleDoubleClick(event: Event): void {
    const id = this.view.entryIdFor(event.target);

    if (id !== undefined) {
      this.emitCommand({ type: 'gallery:openItem', id });
    }
  }

  private handleIntersection(entries: string[]): void {
    WebviewContextProvider.context.store.get(StoreSliceId.VirtualList).setIds(new Set(entries));
  }

  private render(): void {
    this.view.render(resolveGalleryState(WebviewContextProvider.context.store.state));

    /**
     * Oh yiss, we really do that: listen to all the new entries and update the virtualization observer accordingly
     * On re-render.
     *
     * Basically it's load-bearing ONLY on `config:change` re-render
     * Since it kinda re-mounts all the gallery for now
     *
     * TODO: Optimise `config:change` handling
     */
    this.virtualizationObserver.observe(this.view.mountEntries);
  }
}
