import type { BufferItemData } from '@features/buffer';

import { StoreSliceId } from '../definitions';
import { StoreSlice } from './StoreSlice';
import type { StoreSliceEventMap } from './types';

export type ItemsState = {
  readonly byId: ReadonlyMap<string, BufferItemData>;
};
export type ItemsSliceEvents = StoreSliceEventMap<StoreSliceId.Items, ItemsState>;

export class ItemsSlice extends StoreSlice<StoreSliceId.Items, ItemsState> {
  constructor() {
    super(StoreSliceId.Items, { byId: new Map() });
  }

  public get ids(): readonly string[] {
    return [...this.get().byId.keys()];
  }

  public getItem(id: string): BufferItemData | undefined {
    return this.get().byId.get(id);
  }

  public has(id: string): boolean {
    return this.get().byId.has(id);
  }

  /**
   * Updating items without changing their position,
   * since render is order sensitive
   */
  public upsert(items: readonly BufferItemData[]): void {
    if (items.length === 0) {
      return;
    }

    const byId = new Map(this.get().byId);

    for (const item of items) {
      byId.set(item.id, item);
    }

    this.set({ byId });
  }

  public remove(id: string): void {
    if (!this.has(id)) {
      return;
    }

    const byId = new Map(this.get().byId);

    byId.delete(id);

    this.set({ byId });
  }
}
