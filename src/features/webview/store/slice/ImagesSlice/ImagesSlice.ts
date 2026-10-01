import type { DecodedFileSource } from '@features/image/imageDecoder/types';
import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import type { ImageItem, ImagesSlicePayloads, ImagesState } from './types';
import { toImageItem } from './utils';

/**
 * Keeps and handles the data about PROCESSED images.
 */
export class ImagesSlice extends StoreSlice<StoreSliceId.Images, ImagesState, ImagesSlicePayloads> {
  public get selectedId(): string | null {
    return this.getState().selectedId;
  }

  constructor() {
    super(StoreSliceId.Images, { selectedId: null, byId: new Map() });
  }

  public getImage(id: string): ImageItem | undefined {
    return this.getState().byId.get(id);
  }

  public put(id: string, image: ImageItem): void;
  public put(entries: readonly [string, ImageItem][]): void;
  public put(idOrEntries: string | readonly [string, ImageItem][], image?: ImageItem): void {
    const currentState = this.getState();
    const byId = new Map(currentState.byId);

    if (typeof idOrEntries === 'string' && image !== undefined) {
      this.putSingle(idOrEntries, image, byId);
    } else if (Array.isArray(idOrEntries)) {
      idOrEntries.forEach(([id, img]) => {
        this.putSingle(id, img, byId);
      });
    }

    this.patch({ byId });
  }

  public upsert(decoded: readonly DecodedFileSource[]): void {
    this.put(decoded.map((item) => [item.id, toImageItem(item)] as [string, ImageItem]));
  }

  public clearAllExcept(ids: readonly string[]): void {
    const idsToKeep = new Set(ids);
    const currentState = this.getState();
    const currentEntries = [...currentState.byId];
    const entriesToDrop = currentEntries.filter(([id]) => !idsToKeep.has(id));

    if (entriesToDrop.length > 0) {
      this.patch({ byId: new Map(currentEntries.filter(([id]) => idsToKeep.has(id))) });
    }
  }

  public clear(): void {
    this.clearAllExcept([]);
  }

  public setSelected(selectedId: string | null): void {
    this.patch({ selectedId });
  }

  private putSingle(id: string, image: ImageItem, byId: Map<string, ImageItem>): void {
    byId.set(id, image);
  }
}
