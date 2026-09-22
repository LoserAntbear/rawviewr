import { FileSource } from '@features/webview/types';
import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import type { ImageItem, ImagesState } from './types';
import { retireImageBitmap } from './utils';
import { WebviewImageDecoder } from '@features/webview/image/decode/WebviewImageDecoder';
import { FileValidator } from '@features/file/FileValidator';
import { BufferItem } from '@features/buffer/BufferItem';
import { DecodeOptions } from '@features/image/imageDecoder/types';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { withAbortSignalCheck } from '@utils/abort';

/**
 * Keeps and handles the data about PROCESSED images.
 */
export class ImagesSlice extends StoreSlice<StoreSliceId.Images, ImagesState> {
  public get selectedId(): string | null {
    return this.getState().selectedId;
  }

  public get decodeOptions(): DecodeOptions {
    return this.getState().decodeOptions;
  }

  constructor(
    private readonly decoder: WebviewImageDecoder,
  ) {
    super(StoreSliceId.Images, { selectedId: null, decodeOptions: DEFAULT_DECODE_OPTIONS, byId: new Map() });
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

  public async decodeFromSource(source: FileSource, abortSignal?: AbortSignal, options?: DecodeOptions): Promise<void>;
  public async decodeFromSource(sources: FileSource[], abortSignal?: AbortSignal, options?: DecodeOptions): Promise<void>;
  public async decodeFromSource(
    sourceOrSources: FileSource | FileSource[],
    abortSignal?: AbortSignal,
    options: DecodeOptions = this.decodeOptions,
  ): Promise<void> {
    if (Array.isArray(sourceOrSources)) {
      const results = await Promise.all(
        sourceOrSources.map(
          async source => {
            const result = await this.decodeSingle(source, abortSignal, options);

            return result ? [result.id, result] : undefined;
          }
        ).filter(Boolean)
      ) as [string, ImageItem][];

      this.put(results);
    } else {
      const result = await this.decodeSingle(sourceOrSources, abortSignal, options);

      if (result) {
        this.put(result.id, result);
      }
    }
  }

  public setOptions(patch: Partial<DecodeOptions>): void {
    this.patch({ decodeOptions: { ...this.getState().decodeOptions, ...patch } });
  }

  private putSingle(id: string, image: ImageItem, byId: Map<string, ImageItem>): void {
    retireImageBitmap(byId.get(id), image);

    byId.set(id, image);
  }

  private async decodeSingle(
    source: FileSource,
    abortSignal?: AbortSignal,
    options: DecodeOptions = this.decodeOptions,
  ): Promise<ImageItem | undefined> {
    try {
      this.put(source.id, { kind: "pending", id: source.id });

      const bufferItem = await withAbortSignalCheck(
        abortSignal,
        () => BufferItem.fromFileSource(source),
      );

      if (!FileValidator.isValidFileSize(bufferItem.data.byteLength)) {
        throw new Error(`File size exceeds the maximum allowed size of ${FileValidator.maxFileSizeMB} MB.`);
      }

      const image = await withAbortSignalCheck(
        abortSignal,
        () => this.decoder.decode(bufferItem.data, options),
      );

      return {
        kind: "ready",
        id: source.id,
        name: bufferItem.name,
        byteLength: bufferItem.data.byteLength,
        detail: bufferItem.detail ?? bufferItem.name,
        ...image
      };
    } catch (error) {
      InfoMessageController.showError(`Failed to decode image from source: ${error}`);

      const message = Object.hasOwn((error as object), 'message') ? (error as Error).message : String(error);

      this.put(source.id, { kind: "failed", message, id: source.id });

      return undefined;
    }
  }
}
