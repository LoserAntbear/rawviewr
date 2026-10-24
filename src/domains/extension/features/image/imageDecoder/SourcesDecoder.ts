import { BufferItem } from '@EXTENSION/features/buffer/BufferItem';
import { FileValidator } from '@EXTENSION/features/file/FileValidator';
import { InfoMessageController } from '@EXTENSION/features/infoMessage/InfoMessageController';
import { ImageDecoder } from '@SHARED/features/image/imageDecoder/ImageDecoder';
import type { Geometry } from '@SHARED/features/image/imageDecoder/imagePreparation/types';
import type { DecodedArrayBuffer, DecodedFileSource, DecodeOptions } from '@SHARED/features/image/imageDecoder/types';
import type { FileSource } from '@SHARED/features/viewer/types';
import { withAbortSignalCheck, withAbortSignalCheckSync } from '@utils/abort';

export class SourcesDecoder {
  constructor(
    private readonly decoder: ImageDecoder = new ImageDecoder(),
  ) {}

  public async decodeFromSource(
    source: FileSource, options?: DecodeOptions, abortSignal?: AbortSignal,
  ): Promise<DecodedFileSource[]>;
  public async decodeFromSource(
    sources: FileSource[], options?: DecodeOptions, abortSignal?: AbortSignal,
  ): Promise<DecodedFileSource[]>;
  public async decodeFromSource(
    sourceOrSources: FileSource | FileSource[],
    options?: DecodeOptions,
    abortSignal?: AbortSignal,
  ): Promise<DecodedFileSource[]> {
    if (Array.isArray(sourceOrSources)) {
      return await Promise.all(
        sourceOrSources.map(
          async source => {
            return await this.decodeSingle(source, options, abortSignal);
          },
        ).filter(Boolean),
      ) as DecodedFileSource[];
    } else {
      const result = await this.decodeSingle(sourceOrSources, options, abortSignal);

      return [result];
    }
  }

  private async decodeSingle(
    source: FileSource,
    options?: DecodeOptions,
    abortSignal?: AbortSignal,
  ): Promise<DecodedFileSource> {
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

      const image = withAbortSignalCheckSync(
        abortSignal,
        () => this.decodeArrayBuffer(bufferItem.data, options),
      );

      return {
        status: 'success',

        id: source.id,
        name: bufferItem.name,
        byteLength: bufferItem.data.byteLength,
        detail: bufferItem.detail ?? bufferItem.name,
        ...image,
      };
    } catch (error) {
      if (abortSignal?.aborted) {
        throw error;
      }

      InfoMessageController.showError(`Failed to decode image from source: ${error}`);

      return {
        status: 'failure',

        id: source.id,
        message: String(error),
      };
    }
  }

  private decodeArrayBuffer(
    data: ArrayBuffer,
    options: DecodeOptions,
    geometry: Geometry = this.resolveGeometry(data, options),
  ): DecodedArrayBuffer {
    const { image } = this.decoder.decode(new Uint8Array(data), options, geometry);

    return { geometry, image };
  }

  private resolveGeometry(data: ArrayBuffer, options: DecodeOptions): Geometry {
    return this.decoder.resolveGeometry(new Uint8Array(data), options);
  }
}
