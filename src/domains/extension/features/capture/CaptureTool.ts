import { MS_PER_SECOND } from '@definitions/time';

import type { ProcessResult, ProcessRunOptions } from './runProcess';
import { runProcess } from './runProcess';
import type { CaptureLog, CaptureOutcome, CaptureOutputData, CaptureRequest } from './types';

function parseResultData({ stdout }: ProcessResult, outputPath?: string): CaptureOutputData {
  return outputPath === undefined
    ? { kind: 'bytes', bytes: stdout }
    : { kind: 'container', path: outputPath };
}

function logFor(
  invocation: readonly string[],
  { stdout, stderr }: ProcessResult,
  stdoutIsPayload: boolean,
): CaptureLog {
  const nativeOutput = stdoutIsPayload ? stderr : `${stdout.toString()}\n${stderr}`;
  const lines = nativeOutput
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  return [`$ ${invocation.join(' ')}`, ...lines];
}

function parseResultFailure({ stderr }: ProcessResult): string {
  return stderr.trim().length > 0 ? stderr.trim() : 'See the Raw Image Viewer output.';
}

/**
 * **The tool must validate its request before it does anything.**
 * E.G. You can return `missingTarget` outcome, if the capture request is missing one.
 */
export abstract class CaptureTool {
  public abstract readonly label: string;

  /**
   * With `.ext` for the container format, e.g. `.gpucapture`
   */
  public abstract readonly containerFormat: string | null;

  public abstract capture(request: CaptureRequest): Promise<CaptureOutcome>;

  /**
   * Resolves with true if can be run.
   * Throws with the message if not.
   * Simple.
   */
  public checkAvailability(): Promise<true> {
    return Promise.resolve(true);
  }

  protected runInNode(
    command: string,
    args: readonly string[],
    options: ProcessRunOptions,
  ): Promise<ProcessResult> {
    return runProcess(command, args, options);
  }

  // These multiple returns are so MEH
  // FIXME: Refactor to a proper mapping
  protected resultOf(
    invocation: readonly string[],
    run: ProcessResult,
    outputPath: string | undefined,
  ): CaptureOutcome {
    const { outcome } = run;
    const hasOutputContainer = outputPath !== undefined;
    const log = logFor(invocation, run, !hasOutputContainer);

    if (outcome.kind === 'timeout') {
      return {
        kind: 'failed',
        log,
        // FIXME: Add time converter
        reason: `${this.label} did not finish within ${outcome.afterMs / MS_PER_SECOND}s and was killed.`,
      };
    }

    if (outcome.kind === 'killed') {
      return { kind: 'failed', log, reason: `${this.label} was killed by ${outcome.signal}.` };
    }

    if (outcome.code !== 0) {
      return { kind: 'failed', log, reason: `${this.label} exited with ${outcome.code}. ${parseResultFailure(run)}` };
    }

    if (!hasOutputContainer && run.stdout.byteLength === 0) {
      return {
        kind: 'failed',
        log,
        reason: `${this.label} exited cleanly but wrote nothing. ${parseResultFailure(run)}`,
      };
    }

    return { kind: 'captured', log, data: parseResultData(run, outputPath) };
  }
}
