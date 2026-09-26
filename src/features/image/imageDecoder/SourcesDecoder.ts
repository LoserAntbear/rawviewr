import { FileSource } from '@features/webview/types';
import { DecodeOptions } from '@features/image/imageDecoder/types';
import { withAbortSignalCheck } from '@utils/abort';

import { FileValidator } from '@features/file/FileValidator';
import { BufferItem } from '@features/buffer/BufferItem';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';
import { WebviewImageDecoder } from '@features/image/imageDecoder/WebviewImageDecoder';
import { Geometry } from './imagePreparation/types';

type DecodeResult = {
  readonly id: string;
  readonly name: string;
  readonly byteLength: number;
  readonly geometry: Geometry;
  readonly bitmap: ImageBitmap;
  readonly detail: string | null;
}

export class SourcesDecoder {
  constructor(
    private readonly decoder: WebviewImageDecoder,
  ) {}

  public async decodeFromSource(source: FileSource, abortSignal?: AbortSignal, options?: DecodeOptions): Promise<DecodeResult[] | undefined>;
  public async decodeFromSource(sources: FileSource[], abortSignal?: AbortSignal, options?: DecodeOptions): Promise<DecodeResult[] | undefined>;
  public async decodeFromSource(
    sourceOrSources: FileSource | FileSource[],
    abortSignal?: AbortSignal,
    options?: DecodeOptions,
  ): Promise<DecodeResult[] | undefined> {
    if (Array.isArray(sourceOrSources)) {
      return await Promise.all(
        sourceOrSources.map(
          async source => {
            return await this.decodeSingle(source, abortSignal, options);
          }
        ).filter(Boolean)
      ) as DecodeResult[];
    } else {
      const result = await this.decodeSingle(sourceOrSources, abortSignal, options);

      return result ? [result] : undefined;
    }
  }

  private async decodeSingle(
    source: FileSource,
    abortSignal?: AbortSignal,
    options?: DecodeOptions,
  ): Promise<DecodeResult | undefined> {
    try {
      const bufferItem = await withAbortSignalCheck(
        abortSignal,
        () => BufferItem.fromFileSource(source),
      );

      if (!FileValidator.isValidFileSize(bufferItem.data.byteLength)) {
        throw new Error(`File size exceeds the maximum allowed size of ${FileValidator.maxFileSizeMB} MB.`);
      }

      if (!options) {
        throw new Error('Decode options are required.');
      }

      const image = await withAbortSignalCheck(
        abortSignal,
        () => this.decoder.decode(bufferItem.data, options),
      );

      return {
        id: source.id,
        name: bufferItem.name,
        byteLength: bufferItem.data.byteLength,
        detail: bufferItem.detail ?? bufferItem.name,
        ...image
      };
    } catch (error) {
      InfoMessageController.showError(`Failed to decode image from source: ${error}`);

      return undefined;
    }
  }
}
