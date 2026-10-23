import type { FileSource } from '@features/viewer';
import { toChunks } from '@utils/array';
import { attemptAsync } from '@utils/attempt';

import type { SourcesDecoder } from './SourcesDecoder';
import type { DecodedFileSource, DecodeOptions } from './types';

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
  ): Promise<DecodedFileSource[] | null>[] {
    const run = this.startNewRun();
    const results: Promise<DecodedFileSource[] | null>[] = [];

    for (const chunk of toChunks(sources, this.chunkSize)) {
      // Only an abort comes back as a throw; a file that cannot be read is a failure item.
      const decodeCall = attemptAsync<DecodedFileSource[] | null>(
        () => this.decoder.decodeFromSource([...chunk], options, run.signal),
        () => null,
      );

      results.push(decodeCall);
    }

    return results;
  }

  private startNewRun(): AbortController {
    this.currentRun?.abort();
    this.currentRun = new AbortController();

    return this.currentRun;
  }
}
