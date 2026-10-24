import type { FileSource } from '@EXTENSION/features/viewer';
import type { DecodedFileSource, DecodeOptions } from '@SHARED/features/image/imageDecoder/types';
import { toChunks } from '@utils/array';
import { attemptAsync } from '@utils/attempt';

import type { SourcesDecoder } from './SourcesDecoder';

// More or less guessed and impercally fits
// TODO: Consider adding to options
export const DECODE_CHUNK_SIZE = 24 as const;

export class DecodeRunner {
  private currentRun?: AbortController;

  constructor(
    private readonly decoder: SourcesDecoder,
    private readonly chunkSize: number = DECODE_CHUNK_SIZE,
  ) {}

  public run(
    sources: readonly FileSource[],
    options: DecodeOptions,
  ): AsyncGenerator<DecodedFileSource[]> {
    return this.readChunks(sources, options, this.startNewRun());
  }

  private async *readChunks(
    sources: readonly FileSource[],
    options: DecodeOptions,
    run: AbortController,
  ): AsyncGenerator<DecodedFileSource[]> {
    for (const chunk of toChunks(sources, this.chunkSize)) {
      const images = await this.readChunk(chunk, options, run.signal);

      // Stop if the read failed or the run was aborted.
      if (images === null || run.signal.aborted) {
        return;
      }

      yield images;
    }
  }

  private readChunk(
    chunk: readonly FileSource[],
    options: DecodeOptions,
    signal: AbortSignal,
  ): Promise<DecodedFileSource[] | null> {
    return attemptAsync<DecodedFileSource[] | null>(
      () => this.decoder.decodeFromSource([...chunk], options, signal),
      (error) => {
        // Only abort actually throws
        // Other errors are propagated
        if (!signal.aborted) {
          throw error;
        }

        return null;
      },
    );
  }

  private startNewRun(): AbortController {
    this.currentRun?.abort();
    this.currentRun = new AbortController();

    return this.currentRun;
  }
}
