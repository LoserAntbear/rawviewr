import { isHTMLElement } from '@features/webview/utils/html';
import { applyStyleProperties } from '@features/webview/utils/styleProperties';

import { RIVView } from '../RIVView';

import { GALLERY_STYLE_PROPERTIES } from './definitions';
import { ElementBuilder } from './ElementBuilder';
import type { GalleryState } from './state/types';

export class RIVGalleryView extends RIVView {
  public get rootRef(): EventTarget {
    return this.root;
  }

  public get mountEntriesIds(): string[] {
    return Array.from(this.mountEntriesMap.keys());
  }

  public get mountEntries(): HTMLLIElement[] {
    return Array.from(this.mountEntriesMap.values());
  }

  private get listRef(): HTMLUListElement {
    return this.ref<HTMLUListElement>('gallery') ?? (() => { throw new Error('riv-gallery: template is missing #gallery'); })();
  }

  // Keyed by item id, to avoid rebuilds on re-render
  private readonly mountEntriesMap = new Map<string, HTMLLIElement>();

  public render(state: GalleryState): void {
    const list = this.listRef;

    list.dataset.viewMode = state.mode;

    // Every property the tiles inherit, written from one declared set rather than by hand.
    applyStyleProperties(list.style, GALLERY_STYLE_PROPERTIES, state);

    state.imageIds.forEach((id, index) => this.renderEntry(id, index, state.selectedId));
  }

  public entryIdFor(target: EventTarget | null): string | undefined {
    if (!isHTMLElement(target)) {
      return undefined;
    }

    // Probably there's a better way to do this, but for now we rely on the dataset.
    return target.closest('li')?.dataset.itemId;
  }

  private renderEntry(id: string, index: number, selectedId: string | null): void {
    const entry = this.mountEntriesMap.get(id) ?? this.mountEntry(id);

    entry.classList.toggle('selected', id === selectedId);

    // A no-op when the node already sits at that index.
    this.listRef.insertBefore(entry, this.listRef.children[index] ?? null);
  }

  private mountEntry(id: string): HTMLLIElement {
    const entry = ElementBuilder.buildEntry(id);

    this.mountEntriesMap.set(id, entry);

    return entry;
  }
}
