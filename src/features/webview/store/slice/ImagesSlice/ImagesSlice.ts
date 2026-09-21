import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import type { ImageItem, ImagesState } from './types';
import { retireImageBitmap } from './utils';

export class ImagesSlice extends StoreSlice<StoreSliceId.Images, ImagesState> {
  constructor() {
    super(StoreSliceId.Images, { byId: new Map() });
  }

  public getImage(id: string): ImageItem | undefined {
    return this.getState().byId.get(id);
  }

  public put(id: string, image: ImageItem): void {
    const byId = new Map(this.getState().byId);

    retireImageBitmap(byId.get(id), image);

    byId.set(id, image);

    this.set({ byId });
  }

  public clearAllExcept(ids: readonly string[]): void {
    const idsToKeep = new Set(ids);
    const currentEntries = [...this.getState().byId];
    const entriesToDrop = currentEntries.filter(([id]) => !idsToKeep.has(id));

    if (entriesToDrop.length > 0) {
      entriesToDrop.forEach(([, image]) => retireImageBitmap(image));

      this.set({ byId: new Map(currentEntries.filter(([id]) => idsToKeep.has(id))) });
    }
  }

  public clear(): void {
    this.clearAllExcept([]);
  }
}
