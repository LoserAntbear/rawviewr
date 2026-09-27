import { FileSource } from '@features/webview/types';
import type { DecodeOptions, DecodedImage } from '@features/image/imageDecoder/types';
import { ImageDecoder } from '@features/image/imageDecoder/ImageDecoder';
import { withAbortSignalCheck } from '@utils/abort';

import { FileValidator } from '@features/file/FileValidator';
import { BufferItem } from '@features/buffer/BufferItem';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';

import type { DecodedArrayBuffer, DecodedFileSource } from './types';
import { FormatRegistry } from '../format/FormatRegistry';
import { Geometry } from './imagePreparation/types';

export class SourcesDecoder {
  constructor(
    formatRegistry: FormatRegistry,
    private readonly decoder: ImageDecoder = new ImageDecoder(formatRegistry),
  ) {}

  public async decodeFromSource(source: FileSource, options?: DecodeOptions, abortSignal?: AbortSignal,): Promise<DecodedFileSource[]>;
  public async decodeFromSource(sources: FileSource[], options?: DecodeOptions, abortSignal?: AbortSignal): Promise<DecodedFileSource[]>;
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
          }
        ).filter(Boolean)
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

      const image = await withAbortSignalCheck(
        abortSignal,
        () => this.decodeArrayBuffer(bufferItem.data, options),
      );

      return {
        status: 'success',

        id: source.id,
        name: bufferItem.name,
        byteLength: bufferItem.data.byteLength,
        detail: bufferItem.detail ?? bufferItem.name,
        ...image
      };
    } catch (error) {
      InfoMessageController.showError(`Failed to decode image from source: ${error}`);

      return {
        status: 'failure',

        id: source.id,
        message: String(error),
      };
    }
  }

  private async decodeArrayBuffer(
    data: ArrayBuffer,
    options: DecodeOptions,
    signal?: AbortSignal,
    geometry: Geometry = this.resolveGeometry(data, options),
  ): Promise<DecodedArrayBuffer> {
    signal?.throwIfAborted();

    const { image } = this.decoder.decode(new Uint8Array(data), options, geometry);

    // Decoding can take long
    return withAbortSignalCheck(
      signal,
      async () => {
        const bitmap = await createImageBitmap(this.toImageData(image));

        return { geometry, bitmap };
      },
      ({ bitmap }) => bitmap.close(),
    );
  }

  private toImageData(image: DecodedImage): ImageData {
    return new ImageData(image.data, image.width, image.height);
  }

  private resolveGeometry(data: ArrayBuffer, options: DecodeOptions): Geometry {
    return this.decoder.resolveGeometry(new Uint8Array(data), options);
  }
}
