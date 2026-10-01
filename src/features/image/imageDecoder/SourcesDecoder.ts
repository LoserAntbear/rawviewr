import { FileSource } from '@features/webview/types';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import { ImageDecoder } from '@features/image/imageDecoder/ImageDecoder';
import { withAbortSignalCheck, withAbortSignalCheckSync } from '@utils/abort';

import { FileValidator } from '@features/file/FileValidator';
import { BufferItem } from '@features/buffer/BufferItem';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';

import type { DecodedArrayBuffer, DecodedFileSource } from './types';
import { Geometry } from './imagePreparation/types';

export class SourcesDecoder {
  constructor(
    private readonly decoder: ImageDecoder = new ImageDecoder(),
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
