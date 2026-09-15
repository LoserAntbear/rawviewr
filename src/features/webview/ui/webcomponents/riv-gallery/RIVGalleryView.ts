import { isHTMLElement } from '@features/webview/utils/html';

import { RIVView } from '../RIVView';
import { ElementBuilder } from './ElementBuilder';
import type { GalleryState } from './state/types';

export class RIVGalleryView extends RIVView {
  public get rootRef(): EventTarget {
    return this.root;
  }

  // Keyed by item id, to avoid rebuilds on re-render
  private readonly entries = new Map<string, HTMLLIElement>();

  public render(state: GalleryState): void {
    const list = this.ref<HTMLUListElement>('gallery');

    if (!list) {
      throw new Error('riv-gallery: template is missing #gallery');
    }

    list.dataset.viewMode = state.mode;

    this.removeStaleEntries(state.visibleIds);

    state.visibleIds.forEach((id, index) => {
      const entry = this.entries.get(id) ?? this.addEntry(id);

      entry.classList.toggle('selected', id === state.selectedId);

      // A no-op when the node already sits at that index.
      list.insertBefore(entry, list.children[index] ?? null);
    });
  }

  public entryIdFor(target: EventTarget | null): string | undefined {
    if (!isHTMLElement(target)) {
      return undefined;
    }

    // Probably there's a better way to do this, but for now we rely on the dataset.
    return target.closest('li')?.dataset.itemId;
  }

  private addEntry(id: string): HTMLLIElement {
    const entry = ElementBuilder.buildEntry(id);

    this.entries.set(id, entry);

    return entry;
  }

  private removeStaleEntries(visible: readonly string[]): void {
    const keep = new Set(visible);

    for (const [id, entry] of this.entries) {
      if (keep.has(id)) {
        continue;
      }

      entry.remove();
      this.entries.delete(id);
    }
  }
}
