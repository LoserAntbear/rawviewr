import { describe, expect, it } from 'vitest';

import { CaptureTool } from './CaptureTool';
import type { ProcessResult } from './runProcess';
import type { CaptureOutcome } from './types';

/**
 * The shared half of every capture tool, through a subclass that does nothing else — so what is
 * covered here is the base class rather than any one tool's command line. The spawn itself lives
 * in `runProcess.test.ts`; these are fed a finished run, because every branch below is about
 * reading one rather than producing one.
 */
class TestTool extends CaptureTool {
  public readonly label = 'test tool';

  public readonly containerFormat = '.raw';

  /** Never exercised: everything below goes through `read`, which is the shared half. */
  public async capture(): Promise<CaptureOutcome> {
    return { kind: 'missingTarget' };
  }

  /**
   * Two named helpers rather than one with a default, because a default would quietly supply a
   * path to a test that passed `undefined` on purpose — which is exactly the mistake that hid
   * the stdout mode from these tests the first time round.
   */
  public readFile(run: ProcessResult, outputPath = '/tmp/capture.raw'): CaptureOutcome {
    return this.resultOf(['tool', '--once'], run, outputPath);
  }

  public readStream(run: ProcessResult): CaptureOutcome {
    return this.resultOf(['tool', '--once'], run, undefined);
  }
}

const EXITED_WELL: ProcessResult = {
  outcome: { kind: 'exited', code: 0 },
  stdout: Buffer.from(''),
  stderr: '',
};

const INVOCATION = '$ tool --once';

/** Only ever reached through `read`, which supplies a path unless a test takes it away. */
const bytes = (...values: number[]): ProcessResult => (
  { ...EXITED_WELL, stdout: Buffer.from(values) }
);

describe('a tool that has nothing to check cannot refuse to run', () => {
  it('says it is available', async () => {
    expect(await new TestTool().checkAvailability()).toBe(true);
  });
});

describe('reading a finished run as an outcome', () => {
  it('is a capture when the program exited cleanly', () => {
    expect(new TestTool().readFile(EXITED_WELL)).toMatchObject({
      kind: 'captured',
      data: { kind: 'container', path: '/tmp/capture.raw' },
    });
  });

  it('names the tool and the code on a non-zero exit', () => {
    const outcome = new TestTool().readFile({
      ...EXITED_WELL,
      outcome: { kind: 'exited', code: 2 },
      stderr: 'no device',
    });

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'test tool exited with 2. no device' });
  });

  /** Nothing on stderr still has to say where to look, or the message is a dead end. */
  it('points at the output channel when the program said nothing', () => {
    const outcome = new TestTool().readFile({ ...EXITED_WELL, outcome: { kind: 'exited', code: 1 } });

    expect(outcome).toMatchObject({ reason: expect.stringContaining('Raw Image Viewer output') });
  });

  /**
   * A deadline is reported ahead of the exit code, because killing the program is what produced
   * that code — and in seconds, which is the unit the setting is written in.
   */
  it('reports a deadline as a deadline, in seconds', () => {
    const outcome = new TestTool().readFile({
      ...EXITED_WELL,
      outcome: { kind: 'timeout', afterMs: 30_000 },
    });

    expect(outcome).toMatchObject({
      kind: 'failed',
      reason: 'test tool did not finish within 30s and was killed.',
    });
  });

  /** Something else killed it. Saying which signal is the only useful thing we know. */
  it('names the signal when the program was killed from outside', () => {
    const outcome = new TestTool().readFile({
      ...EXITED_WELL,
      outcome: { kind: 'killed', signal: 'SIGTERM' },
    });

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'test tool was killed by SIGTERM.' });
  });
});

describe('where the captured frame ended up', () => {
  it('is the path the tool was given, when it was given one', () => {
    expect(new TestTool().readFile(EXITED_WELL, '/tmp/shot.gputrace')).toMatchObject({
      data: { kind: 'container', path: '/tmp/shot.gputrace' },
    });
  });

  /** No path means the tool streamed it, so the bytes themselves are the capture. */
  it('is the bytes on stdout, when the tool was given nowhere to write', () => {
    const outcome = new TestTool().readStream(bytes(1, 2, 3));

    expect(outcome.kind).toBe('captured');
    expect(outcome.kind === 'captured' && outcome.data.kind === 'bytes'
      ? [...outcome.data.bytes]
      : null).toEqual([1, 2, 3]);
  });

  /**
   * A clean exit having written nothing is a failure, and the most confusing kind: the tool looks
   * like it worked and the viewer opens on an empty buffer. Only checkable in the stdout mode —
   * what a tool wrote to a path of its own is the unpacker's business rather than ours.
   */
  it('refuses a clean exit that produced no bytes at all', () => {
    expect(new TestTool().readStream(EXITED_WELL)).toMatchObject({
      kind: 'failed',
      reason: expect.stringContaining('wrote nothing'),
    });
  });

  it('does not second-guess an empty file the tool wrote itself', () => {
    expect(new TestTool().readFile(EXITED_WELL, '/tmp/capture.raw').kind).toBe('captured');
  });
});

describe('the log a tool hands back instead of writing one', () => {
  it('begins with what was actually run', () => {
    const outcome = new TestTool().readFile(EXITED_WELL);

    expect(outcome.kind === 'captured' && outcome.log[0]).toBe(INVOCATION);
  });

  it('carries both streams, since the useful sentence is usually on stderr', () => {
    const outcome = new TestTool().readFile({
      ...EXITED_WELL,
      stdout: Buffer.from('capture finished\n'),
      stderr: 'warning: no backtraces\n',
    });

    expect(outcome.kind === 'captured' && outcome.log)
      .toEqual([INVOCATION, 'capture finished', 'warning: no backtraces']);
  });

  /**
   * The exception, and the reason the rule is tied to `outputPath`: when stdout is the frame,
   * logging it would fill the channel with a megabyte of mojibake and bury the one line worth
   * reading.
   */
  it('leaves stdout out of it when stdout is the frame', () => {
    const outcome = new TestTool().readStream(
      { ...bytes(0, 255, 7), stderr: 'grabbed 1 frame\n' },
    );

    expect(outcome.kind === 'captured' && outcome.log).toEqual([INVOCATION, 'grabbed 1 frame']);
  });

  it('drops the blank lines a trailing newline leaves behind', () => {
    const outcome = new TestTool().readFile({
      ...EXITED_WELL,
      stdout: Buffer.from('one\n\n'),
      stderr: '\n',
    });

    expect(outcome.kind === 'captured' && outcome.log).toEqual([INVOCATION, 'one']);
  });

  /** A failure is exactly the capture whose output somebody wants to read. */
  it('is there on a failure too', () => {
    const outcome = new TestTool().readFile({
      ...EXITED_WELL,
      outcome: { kind: 'exited', code: 9 },
      stderr: 'device busy',
    });

    expect(outcome.kind === 'failed' && outcome.log).toEqual([INVOCATION, 'device busy']);
  });
});
