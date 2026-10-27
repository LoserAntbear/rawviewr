import type { FileSource } from '@EXTENSION/features/viewer';
import type { DecodedFileSource, DecodeOptions } from '@SHARED/features/image/imageDecoder/types';

import type { SourcesDecoder } from './SourcesDecoder';

type DecodeRun = {
  readonly id: string;
  readonly signal: AbortSignal;
};

export class DecodeRunner {
  private runSequenceId = 0;
  private currentRun?: AbortController;

  constructor(
    private readonly decoder: SourcesDecoder,
  ) {}
  public run(
    sources: readonly FileSource[],
    options: DecodeOptions,
  ): AsyncGenerator<DecodedFileSource[]> {
    return this.streamSources(sources, options, this.startNewRun());
  }

  private async *streamSources(
    sources: readonly FileSource[],
    options: DecodeOptions,
    run: DecodeRun,
  ): AsyncGenerator<DecodedFileSource[]> {
    for (const source of sources) {
      if (run.signal.aborted) {
        return;
      }

      for await (const message of this.decoder.streamFromSource(source, options, run.id, run.signal)) {
        yield [message];
      }
    }
  }

  private startNewRun(): DecodeRun {
    this.currentRun?.abort();
    this.currentRun = new AbortController();
    this.runSequenceId += 1;

    return { id: `decode-${this.runSequenceId}`, signal: this.currentRun.signal };
  }
}
