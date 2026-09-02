import type { BufferItemData, BufferItemRegistry } from '../../buffer';
import type { GalleryViewMode } from '../ui/webcomponents/types';
import { StoreEventType, itemEventType } from './definitions';

/**
 * Single source of truth for the webview.
 *
 * Extends `EventTarget` so custom components can subscribe through the existing
 * `listenTo` / `WebviewDisposableStore` plumbing:
 * `this.observe(store, StoreEventType.Order, handler)`
 *
 * Events are signal-only for now
 */
export class ReactiveStore extends EventTarget {
  private viewMode: GalleryViewMode = 'single';
  private selectedId: string | null = null;

  constructor(
    private readonly bufferItemRegistry: BufferItemRegistry,
  ) {
    super();
  }

  public get mode(): GalleryViewMode {
    return this.viewMode;
  }

  public get selected(): string | null {
    return this.selectedId;
  }

  public get bufferItemIds(): readonly string[] {
    return this.bufferItemRegistry.ids;
  }

  public get visibleIds(): readonly string[] {
    if (this.viewMode === 'gallery') {
      return this.bufferItemIds;
    }

    return this.selectedId === null ? this.bufferItemIds.slice(0, 1) : [this.selectedId];
  }

  public getItem(id: string): BufferItemData | undefined {
    return this.bufferItemRegistry.get(id);
  }

  public addItems(items: BufferItemData[]): void {
    const orderChanged = items.some((item) => !this.bufferItemRegistry.has(item.id));

    this.bufferItemRegistry.upsert(items);

    // Single mode opens blank without this: nothing else ever picks a first item.
    if (this.selectedId === null && this.bufferItemIds.length > 0) {
      this.selectedId = this.bufferItemIds[0];
      this.emit(StoreEventType.Selection);
    }

    // Order first, so a gallery has mounted its children before their items announce.
    if (orderChanged) {
      this.emit(StoreEventType.Order);
    }

    for (const item of items) {
      this.emit(itemEventType(item.id));
    }
  }

  public setViewMode(viewMode: GalleryViewMode): void {
    if (this.viewMode === viewMode) {
      return;
    }

    this.viewMode = viewMode;
    this.emit(StoreEventType.ViewMode);
  }

  public select(id: string): void {
    if (this.selectedId === id || !this.bufferItemRegistry.has(id)) {
      return;
    }

    this.selectedId = id;
    this.emit(StoreEventType.Selection);
  }

  private emit(type: string): void {
    this.dispatchEvent(new Event(type));
  }
}
