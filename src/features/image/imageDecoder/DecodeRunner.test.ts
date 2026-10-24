import { describe, expect, it, vi } from 'vitest';

import type { FileSource } from '@features/viewer';

import { DECODE_CHUNK_SIZE, DecodeRunner } from './DecodeRunner';
import { DEFAULT_DECODE_OPTIONS } from './definitions';
import type { DecodedFileSource } from './types';

/**
 * A viewport asks for every window a fling passes through, and all but the last are wasted.
 * The runner answers that with two rules: a newer run supersedes the one still reading, and
 * instalments are pulled rather than pushed — so whoever consumes them sets the pace.
 */
type Decode = (given: FileSource[], options: unknown, signal: AbortSignal) => Promise<DecodedFileSource[]>;

const sources = (count: number): FileSource[] => Array.from(
  { length: count },
  (_, index) => ({ id: `s${index}`, name: `${index}.raw`, uri: { path: `/${index}.raw` } as never }),
);

const decodedFor = (given: readonly FileSource[]): DecodedFileSource[] => given.map(
  ({ id }) => ({ status: 'failure', id, message: 'stubbed' }),
);

const runnerOver = (decodeFromSource: Decode, chunkSize?: number) =>
  new DecodeRunner({ decodeFromSource } as never, chunkSize);

const collect = async (instalments: AsyncIterable<DecodedFileSource[]>): Promise<string[][]> => {
  const seen: string[][] = [];

  for await (const images of instalments) {
    seen.push(images.map(({ id }) => id));
  }

  return seen;
};

describe('DecodeRunner.run', () => {
  it('gives one instalment per chunk', async () => {
    const runner = runnerOver(async (given) => decodedFor(given));

    const seen = await collect(runner.run(sources(DECODE_CHUNK_SIZE + 6), DEFAULT_DECODE_OPTIONS));

    expect(seen.map((chunk) => chunk.length)).toEqual([DECODE_CHUNK_SIZE, 6]);
  });

  it('takes the chunk size it was given', async () => {
    const runner = runnerOver(async (given) => decodedFor(given), 2);

    expect(await collect(runner.run(sources(5), DEFAULT_DECODE_OPTIONS))).toEqual([
      ['s0', 's1'],
      ['s2', 's3'],
      ['s4'],
    ]);
  });

  it('gives nothing when there is nothing to decode', async () => {
    expect(await collect(runnerOver(async (given) => decodedFor(given)).run([], DEFAULT_DECODE_OPTIONS)))
      .toEqual([]);
  });

  it('hands the decoder a signal, which it never used to get', async () => {
    const signals: AbortSignal[] = [];
    const runner = runnerOver(async (given, _options, signal) => {
      signals.push(signal);

      return decodedFor(given);
    });

    await collect(runner.run(sources(1), DEFAULT_DECODE_OPTIONS));

    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[0]?.aborted).toBe(false);
  });

  /**
   * The whole reason this is pulled rather than pushed. Handing back started promises reads the
   * entire list in parallel and only staggers the messages; a folder of thousands then has every
   * decoded image alive at once, which is the thing virtualisation exists to prevent.
   */
  describe('pulling, not pushing', () => {
    it('reads nothing at all until someone asks', async () => {
      const decode = vi.fn<Decode>(async (given) => decodedFor(given));

      runnerOver(decode).run(sources(100), DEFAULT_DECODE_OPTIONS);
      await Promise.resolve();

      expect(decode).not.toHaveBeenCalled();
    });

    it('reads one chunk at a time, never the one behind it', async () => {
      let inFlight = 0;
      let peak = 0;
      const runner = runnerOver(async (given) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await Promise.resolve();
        inFlight -= 1;

        return decodedFor(given);
      }, 2);

      await collect(runner.run(sources(10), DEFAULT_DECODE_OPTIONS));

      expect(peak).toBe(1);
    });

    it('stops reading when the caller walks away', async () => {
      const decode = vi.fn<Decode>(async (given) => decodedFor(given));
      const runner = runnerOver(decode, 1);

      for await (const images of runner.run(sources(50), DEFAULT_DECODE_OPTIONS)) {
        expect(images).toHaveLength(1);
        break;
      }

      // One chunk read, forty-nine never touched.
      expect(decode).toHaveBeenCalledOnce();
    });
  });

  describe('being superseded', () => {
    /**
     * Superseding has to happen on the call, not on the first pull: a generator body waits to be
     * iterated, and the run being replaced may be one nobody ever gets round to reading.
     */
    it('abandons the run in flight the moment a newer one is asked for', async () => {
      const signals: AbortSignal[] = [];
      const runner = runnerOver(async (given, _options, signal) => {
        signals.push(signal);

        return decodedFor(given);
      }, 1);

      // Pulled once, so the first run's signal is in hand.
      const abandoned = runner.run(sources(5), DEFAULT_DECODE_OPTIONS);

      await abandoned.next();

      expect(signals[0]?.aborted).toBe(false);

      // Nothing pulls this one; the abort still has to land.
      runner.run(sources(5), DEFAULT_DECODE_OPTIONS);

      expect(signals[0]?.aborted).toBe(true);
    });

    it('gives the superseded caller nothing further', async () => {
      let release: (() => void) | undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const runner = runnerOver(async (given, _options, signal) => {
        await held;

        if (signal.aborted) {
          throw new Error('aborted');
        }

        return decodedFor(given);
      }, 1);

      const superseded = collect(runner.run(sources(3), DEFAULT_DECODE_OPTIONS));

      await vi.waitFor(() => expect(release).toBeDefined());
      runner.run(sources(3), DEFAULT_DECODE_OPTIONS);
      release?.();

      expect(await superseded).toEqual([]);
    });

    /**
     * The abort can land between a chunk coming back and it being handed over, and a decoder
     * that does not watch its signal returns that chunk quite happily.
     */
    it('drops a chunk that finished reading just as it was superseded', async () => {
      let release: (() => void) | undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let first = true;
      const runner = runnerOver(async (given) => {
        if (first) {
          first = false;
          await held;
        }

        return decodedFor(given);
      }, 1);

      const superseded = collect(runner.run(sources(3), DEFAULT_DECODE_OPTIONS));

      await vi.waitFor(() => expect(first).toBe(false));
      runner.run(sources(3), DEFAULT_DECODE_OPTIONS);
      release?.();

      expect(await superseded).toEqual([]);
    });
  });

  /**
   * A read that cannot happen for any reason other than being abandoned is a fault, not a
   * quiet nothing: swallowed, it shows up as tiles that simply never arrive.
   */
  it('carries a genuine failure upward rather than ending quietly', async () => {
    const runner = runnerOver(() => Promise.reject(new Error('decoder is broken')));

    await expect(collect(runner.run(sources(1), DEFAULT_DECODE_OPTIONS)))
      .rejects.toThrow('decoder is broken');
  });
});
