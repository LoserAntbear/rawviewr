import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import type { StoreSliceEventMap } from '../types';
import { FileSource } from '@features/webview/types';

export type SourcesState = {
  readonly byId: ReadonlyMap<string, FileSource>;
};
export type SourcesSliceEvents = StoreSliceEventMap<StoreSliceId.Sources, SourcesState>;

export class SourcesSlice extends StoreSlice<StoreSliceId.Sources, SourcesState> {
  constructor() {
    super(StoreSliceId.Sources, { byId: new Map() });
  }

  public get ids(): readonly string[] {
    return [...this.getState().byId.keys()];
  }

  public getSource(id: string): FileSource | undefined {
    return this.getState().byId.get(id);
  }

  public has(id: string): boolean {
    return this.getState().byId.has(id);
  }

  /**
   * Updating sources in the order they come to avoid reordering,
   * since render is order sensitive
   */
  public upsert(items: readonly FileSource[]): void {
    if (items.length === 0) {
      return;
    }

    const byId = new Map(this.getState().byId);

    for (const item of items) {
      byId.set(item.id, item);
    }

    this.set({ byId });
  }

  public remove(id: string): void {
    if (!this.has(id)) {
      return;
    }

    const byId = new Map(this.getState().byId);

    byId.delete(id);

    this.set({ byId });
  }
}
