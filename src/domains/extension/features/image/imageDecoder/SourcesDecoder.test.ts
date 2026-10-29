import { window, workspace } from 'vscode';

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '@EXTENSION/features/appContext/AppContextProvider';
import type { FileSource } from '@EXTENSION/features/viewer';
import { DEFAULT_DECODE_OPTIONS, DEFAULT_ROWS_PER_SEGMENT } from '@SHARED/features/image/imageDecoder/definitions';
import type { DecodedFileSource } from '@SHARED/features/image/imageDecoder/types';

import { SourcesDecoder } from './SourcesDecoder';

/**
 * A decode is a sequence now — open, a band at a time, then however it ended — and it never
 * throws: the caller is a `for await` whose job is to deliver messages, not to handle faults.
 *
 * What matters most is how an abandoned decode leaves: quietly. Reported as an ordinary failure
 * it would raise one VS Code notification per file and paint every tile of the abandoned window
 * as broken.
 */
const source = (id: string): FileSource => ({ id, name: `${id}.raw`, uri: { path: `/${id}.raw` } as never });

let decoder: SourcesDecoder;

// `FileValidator` reads the size ceiling off the app context, which only the host creates.
beforeAll(() => {
  AppContextProvider.create({ workspaceConfig: { read: () => 64 } as never });
});

beforeEach(() => {
  decoder = new SourcesDecoder();
  vi.mocked(workspace.fs.readFile).mockResolvedValue(new Uint8Array(24) as never);
});

const collect = async (
  stream: AsyncIterable<DecodedFileSource>,
): Promise<DecodedFileSource[]> => {
  const seen: DecodedFileSource[] = [];

  for await (const message of stream) {
    seen.push(message);
  }

  return seen;
};

const statuses = (messages: readonly DecodedFileSource[]): string[] => messages.map(({ status }) => status);

/**
 * Taller than one band, so the decode actually has a "between bands" to be interrupted at and
 * more than one offset to get right. rgba4444 is 2 bytes a pixel, so 2 px a row is 4 bytes.
 */
const TALL_ROWS = DEFAULT_ROWS_PER_SEGMENT + 6;
const tallOptions = { ...DEFAULT_DECODE_OPTIONS, width: 2, height: TALL_ROWS };

function mockTallSource(): void {
  vi.mocked(workspace.fs.readFile).mockResolvedValue(new Uint8Array(TALL_ROWS * 4) as never);
}

describe('SourcesDecoder.streamFromSource', () => {
  it('opens, delivers the pixels in bands, then closes', async () => {
    const seen = await collect(decoder.streamFromSource(source('a'), DEFAULT_DECODE_OPTIONS, 'run-1'));

    expect(statuses(seen).slice(0, 2)).toEqual(['reading', 'start']);
    expect(statuses(seen).at(-1)).toBe('success');
    expect(seen.filter(({ status }) => status === 'progress').length).toBeGreaterThan(0);
  });

  /**
   * Reading a gigabyte off disk is the longest part of a decode and it happens before anything
   * is known about the file, so this is the only message the view can show for that whole wait.
   */
  it('says it is reading before it opens the file, not after', async () => {
    const opened: string[] = [];

    vi.mocked(workspace.fs.readFile).mockImplementation(async () => {
      opened.push('read');

      return new Uint8Array(24) as never;
    });

    const stream = decoder.streamFromSource(source('a'), DEFAULT_DECODE_OPTIONS, 'run-1');
    const first = await stream.next();

    expect(first.value).toEqual({ status: 'reading', runId: 'run-1', id: 'a' });
    expect(opened).toEqual([]);

    await stream.return(undefined);
  });

  it('carries the run id on every message, so a superseded band can be told apart', async () => {
    const seen = await collect(decoder.streamFromSource(source('a'), DEFAULT_DECODE_OPTIONS, 'run-7'));

    expect(seen.every((message) => !('runId' in message) || message.runId === 'run-7')).toBe(true);
  });

  it('describes the file before any pixels, so the caption and canvas need not wait', async () => {
    const [, second] = await collect(decoder.streamFromSource(source('a'), DEFAULT_DECODE_OPTIONS, 'run-1'));

    expect(second?.status).toBe('start');
    expect(second && 'geometry' in second ? second.geometry.width > 0 : false).toBe(true);
  });

  it('covers every row exactly once, with no gap between bands', async () => {
    mockTallSource();

    const seen = await collect(decoder.streamFromSource(source('a'), tallOptions, 'run-1'));
    const bands = seen.flatMap((message) => (message.status === 'progress' ? [message.segment] : []));

    // More than one band, or this would prove nothing about offsets.
    expect(bands.length).toBeGreaterThan(1);
    expect(bands.reduce((rows, { totalRows }) => rows + totalRows, 0)).toBe(TALL_ROWS);
    // Each band starts exactly where the one before it ended.
    expect(bands.map(({ row }) => row)).toEqual([0, DEFAULT_ROWS_PER_SEGMENT]);
    expect(bands.map(({ totalRows }) => totalRows)).toEqual([DEFAULT_ROWS_PER_SEGMENT, 6]);
  });

  it('reports a file it cannot read, and says so out loud', async () => {
    vi.mocked(workspace.fs.readFile).mockRejectedValue(new Error('gone'));

    const seen = await collect(decoder.streamFromSource(source('a'), DEFAULT_DECODE_OPTIONS, 'run-1'));

    expect(statuses(seen)).toEqual(['reading', 'failure']);
    expect(window.showErrorMessage).toHaveBeenCalled();
  });

  it('leaves an abandoned decode as an interruption, without a word', async () => {
    const run = new AbortController();

    run.abort();

    const seen = await collect(
      decoder.streamFromSource(source('a'), DEFAULT_DECODE_OPTIONS, 'run-1', run.signal),
    );

    expect(statuses(seen)).toEqual(['reading', 'interruption']);
    expect(window.showErrorMessage).not.toHaveBeenCalled();
  });

  it('abandons mid-flight, once the window it was reading for has moved on', async () => {
    const run = new AbortController();

    vi.mocked(workspace.fs.readFile).mockImplementation(async () => {
      run.abort();

      return new Uint8Array(24) as never;
    });

    const seen = await collect(
      decoder.streamFromSource(source('a'), DEFAULT_DECODE_OPTIONS, 'run-1', run.signal),
    );

    expect(statuses(seen).at(-1)).toBe('interruption');
    expect(statuses(seen)).not.toContain('success');
    expect(window.showErrorMessage).not.toHaveBeenCalled();
  });

  /**
   * The band loop can only see an abort that was called between pulls, which is exactly what the
   * consumer's `await bridge.post(...)` creates. Aborting after the first band proves the loop
   * stops where it is rather than running to the end of the image.
   */
  it('stops between bands when the run is abandoned part-way', async () => {
    const run = new AbortController();

    mockTallSource();

    const stream = decoder.streamFromSource(source('a'), tallOptions, 'run-1', run.signal);

    const seen: DecodedFileSource[] = [];

    for await (const message of stream) {
      seen.push(message);

      // Abort on the first band only, so there is a second band left to not be delivered.
      if (message.status === 'progress' && !run.signal.aborted) {
        run.abort();
      }
    }

    expect(seen.filter(({ status }) => status === 'progress')).toHaveLength(1);

    expect(statuses(seen).at(-1)).toBe('interruption');
    expect(statuses(seen)).not.toContain('success');
    expect(window.showErrorMessage).not.toHaveBeenCalled();
  });
});
