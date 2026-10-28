import { BufferItem } from '@EXTENSION/features/buffer/BufferItem';
import { InfoMessageController } from '@EXTENSION/features/infoMessage/InfoMessageController';
import { ImageDecoder } from '@SHARED/features/image/imageDecoder/ImageDecoder';
import type {
  DecodedFileOutcome,
  DecodedFileSource,
  DecodeOptions,
} from '@SHARED/features/image/imageDecoder/types';
import type { FileSource } from '@SHARED/features/viewer/types';
import { withAbortSignalCheck } from '@utils/abort';

import type { OpenedSource } from './types';

export class SourcesDecoder {
  constructor(
    private readonly decoder: ImageDecoder = new ImageDecoder(),
  ) {}

  public async *streamFromSource(
    source: FileSource,
    options: DecodeOptions,
    runId: string,
    signal?: AbortSignal,
  ): AsyncGenerator<DecodedFileSource> {
    try {
      const {
        bytes,
        ...sourceData
      } = await this.openSource(source, options, signal);

      yield {
        status: 'start',

        ...sourceData,
        runId,
        id: source.id,
      };

      for (const segment of this.decoder.decodeSequential(bytes, options, sourceData.geometry)) {
        if (signal?.aborted) {
          throw new Error('Decoder received abort signal');
        }

        yield { status: 'progress', runId, id: source.id, segment };
      }

      yield { status: 'success', runId, id: source.id };
    } catch (error) {
      yield this.toFailedOutcome(source.id, runId, error, signal);
    }
  }

  private async openSource(
    source: FileSource,
    options: DecodeOptions,
    signal?: AbortSignal,
  ): Promise<OpenedSource> {
    const bufferItem = await withAbortSignalCheck(
      signal,
      () => BufferItem.fromFileSource(source),
    );

    // TEMPORARY, for testing the 1 GiB sample. Restore before release — and restore the
    // `FileValidator` import with it, which had to go for the build to stay clean.
    // if (!FileValidator.isValidFileSize(bufferItem.data.byteLength)) {
    //   throw new Error(`File size exceeds the maximum allowed size of ${FileValidator.maxFileSizeMB} MB.`);
    // }

    const bytes = new Uint8Array(bufferItem.data);

    return {
      bytes,
      name: bufferItem.name,
      byteLength: bufferItem.data.byteLength,
      detail: bufferItem.detail ?? bufferItem.name,
      geometry: this.decoder.resolveGeometry(bytes, options),
    };
  }

  private toFailedOutcome(
    id: string,
    runId: string,
    error: unknown,
    signal?: AbortSignal,
  ): DecodedFileOutcome {
    let outcome: DecodedFileOutcome;

    if (signal?.aborted) {
      outcome = { status: 'interruption', runId, id };
    } else {
      InfoMessageController.showError(`Failed to decode image from source: ${error}`);

      outcome = { status: 'failure', id, message: String(error) };
    }

    return outcome;
  }
}
