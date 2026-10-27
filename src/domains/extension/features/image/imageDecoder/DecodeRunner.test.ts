import { describe, expect, it, vi } from 'vitest';

import type { FileSource } from '@EXTENSION/features/viewer';
import { DEFAULT_DECODE_OPTIONS } from '@SHARED/features/image/imageDecoder/definitions';
import type { DecodedFileSource } from '@SHARED/features/image/imageDecoder/types';

import { DecodeRunner } from './DecodeRunner';

/**
 * A viewport asks for every window a fling passes through, and all but the last are wasted.
 * The runner answers that with two rules: a newer run supersedes the one still reading, and
 * messages are pulled rather than pushed — so whoever consumes them sets the pace.
 *
 * Files are streamed one at a time, which is what keeps the peak at a single source and a
 * single band however many files were asked for.
 */
type Stream = (
  source: FileSource,
  options: unknown,
  runId: string,
  signal: AbortSignal,
) => AsyncGenerator<DecodedFileSource>;

const sources = (count: number): FileSource[] => Array.from(
  { length: count },
  (_, index) => ({ id: `s${index}`, name: `${index}.raw`, uri: { path: `/${index}.raw` } as never }),
);

/** The shortest honest sequence: open, one band, close. */
function sequenceFor(source: FileSource, runId: string): DecodedFileSource[] {
  return [
    {
      status: 'start',
      runId,
      id: source.id,
      name: source.name,
      detail: null,
      byteLength: 4,
      geometry: {
        width: 1,
        height: 1,
        frameCount: 1,
        bytesPerRow: 4,
        bytesPerFrame: 4,
        availableBytes: 4,
        baseOffset: 0,
        lockedByHeader: false,
      },
    },
    { status: 'progress', runId, id: source.id, segment: { row: 0, totalRows: 1, data: new Uint8ClampedArray(4) } },
    { status: 'success', runId, id: source.id },
  ];
}

const streamsOf = (stream: Stream) => new DecodeRunner({ streamFromSource: stream } as never);

const plainStream: Stream = async function* (source, _options, runId) {
  yield* sequenceFor(source, runId);
};

const collect = async (messages: AsyncIterable<DecodedFileSource[]>): Promise<DecodedFileSource[]> => {
  const seen: DecodedFileSource[] = [];

  for await (const batch of messages) {
    seen.push(...batch);
  }

  return seen;
};

describe('DecodeRunner.run', () => {
  it('gives the whole sequence for each file, in order', async () => {
    const seen = await collect(streamsOf(plainStream).run(sources(2), DEFAULT_DECODE_OPTIONS));

    expect(seen.map(({ status, id }) => `${id}:${status}`)).toEqual([
      's0:start', 's0:progress', 's0:success',
      's1:start', 's1:progress', 's1:success',
    ]);
  });

  it('gives nothing when there is nothing to decode', async () => {
    expect(await collect(streamsOf(plainStream).run([], DEFAULT_DECODE_OPTIONS))).toEqual([]);
  });

  it('hands the decoder a signal and one run id for the whole request', async () => {
    const runIds: string[] = [];
    const signals: AbortSignal[] = [];
    const stream: Stream = async function* (source, _options, runId, signal) {
      runIds.push(runId);
      signals.push(signal);

      yield* sequenceFor(source, runId);
    };

    await collect(streamsOf(stream).run(sources(3), DEFAULT_DECODE_OPTIONS));

    expect(new Set(runIds).size).toBe(1);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[0]?.aborted).toBe(false);
  });

  it('gives a later run a different id, so its bands cannot be mistaken for the old ones', async () => {
    const runIds: string[] = [];
    const stream: Stream = async function* (source, _options, runId) {
      runIds.push(runId);

      yield* sequenceFor(source, runId);
    };
    const runner = streamsOf(stream);

    await collect(runner.run(sources(1), DEFAULT_DECODE_OPTIONS));
    await collect(runner.run(sources(1), DEFAULT_DECODE_OPTIONS));

    expect(runIds[0]).not.toBe(runIds[1]);
  });

  /**
   * The whole reason this is pulled rather than pushed. Handing back started promises reads the
   * entire list in parallel and only staggers the messages; a folder of thousands then has every
   * decoded image alive at once, which is the thing virtualisation exists to prevent.
   */
  describe('pulling, not pushing', () => {
    it('reads nothing at all until someone asks', async () => {
      const stream = vi.fn<Stream>(plainStream);

      streamsOf(stream).run(sources(100), DEFAULT_DECODE_OPTIONS);
      await Promise.resolve();

      expect(stream).not.toHaveBeenCalled();
    });

    it('opens one file at a time, never the one behind it', async () => {
      let inFlight = 0;
      let peak = 0;
      const stream: Stream = async function* (source, _options, runId) {
        inFlight += 1;
        peak = Math.max(peak, inFlight);

        yield* sequenceFor(source, runId);

        inFlight -= 1;
      };

      await collect(streamsOf(stream).run(sources(10), DEFAULT_DECODE_OPTIONS));

      expect(peak).toBe(1);
    });

    it('stops reading when the caller walks away', async () => {
      const stream = vi.fn<Stream>(plainStream);

      for await (const batch of streamsOf(stream).run(sources(50), DEFAULT_DECODE_OPTIONS)) {
        expect(batch).toHaveLength(1);
        break;
      }

      // One file opened, forty-nine never touched.
      expect(stream).toHaveBeenCalledOnce();
    });
  });

  describe('being superseded', () => {
    /**
     * Superseding has to happen on the call, not on the first pull: a generator body waits to be
     * iterated, and the run being replaced may be one nobody ever gets round to reading.
     */
    it('abandons the run in flight the moment a newer one is asked for', async () => {
      const signals: AbortSignal[] = [];
      const stream: Stream = async function* (source, _options, runId, signal) {
        signals.push(signal);

        yield* sequenceFor(source, runId);
      };
      const runner = streamsOf(stream);

      // Pulled once, so the first run's signal is in hand.
      const abandoned = runner.run(sources(5), DEFAULT_DECODE_OPTIONS);

      await abandoned.next();

      expect(signals[0]?.aborted).toBe(false);

      // Nothing pulls this one; the abort still has to land.
      runner.run(sources(5), DEFAULT_DECODE_OPTIONS);

      expect(signals[0]?.aborted).toBe(true);
    });

    it('stops moving on to the next file once superseded', async () => {
      const opened: string[] = [];
      const stream: Stream = async function* (source, _options, runId) {
        opened.push(source.id);

        yield* sequenceFor(source, runId);
      };
      const runner = streamsOf(stream);
      const superseded = runner.run(sources(5), DEFAULT_DECODE_OPTIONS);

      // Drain the first file's sequence, then supersede before the second is reached.
      await superseded.next();
      runner.run(sources(5), DEFAULT_DECODE_OPTIONS);

      await collect({ [Symbol.asyncIterator]: () => superseded });

      expect(opened).toEqual(['s0']);
    });
  });

  /**
   * A decode that fails says so as a message — the decoder turns faults into `failure` so the
   * view hears about them. A throw escaping it is a bug in the decoder, not a failed decode,
   * and must not be swallowed into tiles that simply never arrive.
   */
  it('carries a thrown fault upward rather than ending quietly', async () => {
    const stream: Stream = async function* () {
      throw new Error('decoder is broken');

      yield undefined as never;
    };

    await expect(collect(streamsOf(stream).run(sources(1), DEFAULT_DECODE_OPTIONS)))
      .rejects.toThrow('decoder is broken');
  });
});
