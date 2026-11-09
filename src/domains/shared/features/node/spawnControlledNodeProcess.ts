import { spawn } from 'node:child_process';

import { ControlledTimeout } from '@utils/time/ControlledTimeout';

import type { ProcessOutcome, ProcessResult, ProcessRunOptions } from './types';

function outcomeOf(
  code: number | null,
  signal: NodeJS.Signals | null,
  timedOutAfterMs: number | null,
): ProcessOutcome {
  if (timedOutAfterMs !== null) {
    return { kind: 'timeout', afterMs: timedOutAfterMs };
  }

  if (signal !== null) {
    return { kind: 'killed', signal };
  }

  // Node sets exactly one of the two, so this fallback is unreachable — the types cannot say so.
  return { kind: 'exited', code: code ?? 0 };
}

export function spawnControlledNodeProcess(
  command: string,
  args: readonly string[],
  { cwd, timeoutMs }: ProcessRunOptions,
): Promise<ProcessResult> {
  return new Promise<ProcessResult>((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd,
      shell: false,
      detached: false,
      windowsHide: true,
    });

    /**
     * I keep the chuncks as whole Buffers and only join them at the end.
     *
     * Appending `chunk.toString()` decodes each chunk in isolation,
     * which mangles any byte that is not text and splits a multi-byte sequence
     * traspassing the chunk boundaries.
     */
    const stdout: Buffer[] = [];
    let stderr = '';

    // Strictly kill rather than gracefully terminate:
    // the deadline is the end of the process.
    const deadline = new ControlledTimeout(timeoutMs, () => {
      child.kill('SIGKILL');
    });

    child.stdout.on('data', (chunk: Buffer) => {
      stdout.push(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      deadline.ifPending(() => reject(error));
    });

    child.on('close', (code, signal) => {
      deadline.clear();

      resolve({
        stderr,
        stdout: Buffer.concat(stdout),
        outcome: outcomeOf(code, signal, deadline.isTimedOut ? timeoutMs : null),
      });
    });
  });
}
