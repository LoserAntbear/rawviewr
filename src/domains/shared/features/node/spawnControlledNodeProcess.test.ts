import { describe, expect, it } from 'vitest';

import { spawnControlledNodeProcess } from './spawnControlledNodeProcess';

/**
 * Node itself stands in for the capture tool throughout. That is hermetic, works on every
 * platform, needs no `child_process` mock, and covers the real spawn, the real exit code, the
 * deadline and the `close`-ordering guarantee at once. A mocked spawn would only ever have proved
 * that the mock was called.
 */
const run = (script: string, timeoutMs = 10_000) => (
  spawnControlledNodeProcess(process.execPath, ['-e', script], { timeoutMs })
);

/**
 * Exits at once, having handed its stdout to a detached child that writes 300ms later.
 * `String.fromCharCode` only to keep the inner script free of quotes it would have to escape.
 */
const LEAVES_A_CHILD_HOLDING_STDOUT = [
  'const { spawn } = require("child_process");',
  'spawn(process.execPath, ["-e", "setTimeout(() => process.stdout.write(String.fromCharCode(108,97,116,101)), 300)"],',
  ' { stdio: "inherit", detached: true }).unref();',
  'process.exit(0);',
].join('');

describe('running a program', () => {
  it('collects what it wrote and the code it exited with', async () => {
    const result = await run('process.stdout.write("64 bytes")');

    expect(result.outcome).toEqual({ kind: 'exited', code: 0 });
    expect(result.stdout.toString()).toBe('64 bytes');
  });

  it('keeps stderr apart from stdout', async () => {
    const result = await run('process.stderr.write("boom")');

    expect(result.stdout).toHaveLength(0);
    expect(result.stderr).toBe('boom');
  });

  it('reports the exit code rather than throwing on it', async () => {
    expect((await run('process.exit(3)')).outcome).toEqual({ kind: 'exited', code: 3 });
  });

  it('has everything the program wrote by the time it resolves', async () => {
    expect((await run('process.stdout.write("x".repeat(200000))')).stdout).toHaveLength(200_000);
  });

  /**
   * `close` rather than `exit`, and this is the difference between them: a program that leaves a
   * child of its own holding the pipe has exited long before its output is finished. On `exit`
   * this comes back empty — a truncated capture that looks like a successful one. Volume alone
   * does not show it up, because a child filling the pipe is blocked on the write and cannot
   * exit first.
   */
  it('waits for the output to end, not merely for the program to exit', async () => {
    expect((await run(LEAVES_A_CHILD_HOLDING_STDOUT)).stdout.toString()).toBe('late');
  });

  /**
   * The reason stdout is a Buffer. A captured frame is arbitrary bytes, and `0xFF` on its own is
   * not valid UTF-8 — accumulating `chunk.toString()` turns it into U+FFFD and every pixel after
   * a stray byte is wrong, with nothing anywhere to say so.
   */
  it('hands back binary output byte for byte', async () => {
    const result = await run('process.stdout.write(Buffer.from([0,255,128,10,0,13,254]))');

    expect([...result.stdout]).toEqual([0, 255, 128, 10, 0, 13, 254]);
  });

  /**
   * Our own deadline, reported as itself. It kills with SIGKILL, so reading the signal instead
   * would say "killed by SIGKILL" about something we did on purpose and can explain far better.
   */
  it('kills a program that will not finish, and says that is what happened', async () => {
    const result = await run('setTimeout(() => undefined, 60000)', 250);

    expect(result.outcome).toEqual({ kind: 'timeout', afterMs: 250 });
  });

  /**
   * The likeliest real failure, and why an `error` listener is not optional: without one the
   * event is thrown out of the emitter instead of reaching the caller.
   */
  it('rejects rather than hanging when the program does not exist', async () => {
    await expect(spawnControlledNodeProcess('rawviewr-no-such-capture-tool', [], { timeoutMs: 10_000 }))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });
});
