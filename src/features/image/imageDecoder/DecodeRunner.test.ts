import { describe, expect, it, vi } from 'vitest';

import type { FileSource } from '@features/viewer';

import { DECODE_CHUNK_SIZE, DecodeRunner } from './DecodeRunner';
import { DEFAULT_DECODE_OPTIONS } from './definitions';
import type { DecodedFileSource } from './types';

/**
 * A viewport asks for every window a fling passes through, and all but the last are wasted.
 * The runner answers that with two rules: a newer run supersedes the one still reading, and
 * what is read comes back in instalments rather than one lump.
 */
const sources = (count: number): FileSource[] => Array.from(
  { length: count },
  (_, index) => ({ id: `s${index}`, name: `${index}.raw`, uri: { path: `/${index}.raw` } as never }),
);

const decodedFor = (given: readonly FileSource[]): DecodedFileSource[] => given.map(
  ({ id }) => ({ status: 'failure', id, message: 'stubbed' }),
);

const runnerOver = (
  decodeFromSource: (given: FileSource[], options: unknown, signal: AbortSignal) => Promise<DecodedFileSource[]>,
  chunkSize?: number,
) => new DecodeRunner({ decodeFromSource } as never, chunkSize);

const settle = (results: Promise<DecodedFileSource[] | null>[]) => Promise.all(results);

describe('DecodeRunner.run', () => {
  it('hands back one instalment per chunk', async () => {
    const runner = runnerOver(async (given) => decodedFor(given));

    const results = runner.run(sources(DECODE_CHUNK_SIZE + 6), DEFAULT_DECODE_OPTIONS);

    expect(results).toHaveLength(2);
    expect((await settle(results)).map((chunk) => chunk?.length)).toEqual([DECODE_CHUNK_SIZE, 6]);
  });

  it('takes the chunk size it was given', async () => {
    const runner = runnerOver(async (given) => decodedFor(given), 2);

    const results = runner.run(sources(5), DEFAULT_DECODE_OPTIONS);

    expect((await settle(results)).map((chunk) => chunk?.length)).toEqual([2, 2, 1]);
  });

  it('asks for nothing when there is nothing to decode', () => {
    expect(runnerOver(async (given) => decodedFor(given)).run([], DEFAULT_DECODE_OPTIONS)).toEqual([]);
  });

  it('hands the decoder a signal, which it never used to get', async () => {
    const signals: AbortSignal[] = [];
    const runner = runnerOver(async (given, _options, signal) => {
      signals.push(signal);

      return decodedFor(given);
    });

    await settle(runner.run(sources(1), DEFAULT_DECODE_OPTIONS));

    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[0]?.aborted).toBe(false);
  });

  it('abandons the run in flight when a newer one starts', async () => {
    const seen: AbortSignal[] = [];
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    const runner = runnerOver(async (given, _options, signal) => {
      seen.push(signal);
      await held;

      return decodedFor(given);
    });

    const superseded = runner.run(sources(1), DEFAULT_DECODE_OPTIONS);

    await vi.waitFor(() => expect(seen).toHaveLength(1));

    const winner = runner.run(sources(1), DEFAULT_DECODE_OPTIONS);

    release?.();
    await Promise.all([settle(superseded), settle(winner)]);

    expect([seen[0]?.aborted, seen[1]?.aborted]).toEqual([true, false]);
  });

  /**
   * A read that was superseded throws rather than reporting, and that becomes a `null`
   * instalment — which is how the caller tells "nothing to show" from "nothing was wanted".
   */
  it('answers with nothing for an instalment that could not be read', async () => {
    const runner = runnerOver(async (_given, _options, signal) => {
      await Promise.resolve();

      if (signal.aborted) {
        throw new Error('aborted');
      }

      return [];
    });

    const superseded = runner.run(sources(1), DEFAULT_DECODE_OPTIONS);
    const winner = runner.run(sources(1), DEFAULT_DECODE_OPTIONS);

    expect(await settle(superseded)).toEqual([null]);
    expect(await settle(winner)).toEqual([[]]);
  });
});
