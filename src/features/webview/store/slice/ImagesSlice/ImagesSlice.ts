import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import type { ImageItem, ImagesState } from './types';
import { retireImageBitmap } from './utils';
import { WebviewImageDecoder } from '@features/webview/image/WebviewImageDecoder';

/**
 * Keeps and handles the data about PROCESSED images.
 */
export class ImagesSlice extends StoreSlice<StoreSliceId.Images, ImagesState> {
  public get selectedId(): string | null {
    return this.getState().selectedId;
  }

  constructor(
    private readonly decoder: WebviewImageDecoder,
  ) {
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

  public clearAllExcept(ids: readonly string[]): void {
    const idsToKeep = new Set(ids);
    const currentState = this.getState();
    const currentEntries = [...currentState.byId];
    const entriesToDrop = currentEntries.filter(([id]) => !idsToKeep.has(id));

    if (entriesToDrop.length > 0) {
      entriesToDrop.forEach(([, image]) => retireImageBitmap(image));

      this.patch({ byId: new Map(currentEntries.filter(([id]) => idsToKeep.has(id))) });
    }
  }

  public clear(): void {
    this.clearAllExcept([]);
  }

  public setSelected(selectedId: string | null): void {
    this.patch({ selectedId });
  }

  public async decodeFromSource(id: string, source: ArrayBuffer): Promise<void> {
    const image = await this.decoder.decode(source);

    this.put(id, image);
  }

  private putSingle(id: string, image: ImageItem, byId: Map<string, ImageItem>): void {
    retireImageBitmap(byId.get(id), image);

    byId.set(id, image);
  }
}
