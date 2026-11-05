import { spawn } from 'node:child_process';

export type ToolRun = {
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly code: number | null;
};

export type ToolRunOptions = {
  readonly timeoutMs: number;

  readonly cwd?: string;
  /** Called with every chunk as it arrives, so a slow tool is not silent until it exits. */
  readonly onOutput?: (chunk: string) => void;
};

export abstract class CaptureTool<TCaptureOutput = unknown> {
  public abstract run(): Promise<TCaptureOutput>;

  /**
   * `shell: false` so the argv executed is exactly the argv visible in settings,
   *
   * Resolves on `close` rather than `exit`
   * `close` fires once stdio has closed
   * this weay we can finish collecting the output before resolving.
   */
  protected async runInNode(
    command: string,
    args: readonly string[],
    { cwd, timeoutMs, onOutput }: ToolRunOptions,
  ): Promise<ToolRun>  {
    return new Promise<ToolRun>((resolve, reject) => {
      const child = spawn(command, [...args], {
        cwd,
        shell: false,
        detached: false,
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const deadline = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
        onOutput?.(chunk.toString());
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
        onOutput?.(chunk.toString());
      });

      /**
       * Mandatory: an `error` event with no listener is thrown out of the emitter. It is also the
       * likeliest real failure — a GUI-launched VS Code on macOS does not inherit the login
       * shell's PATH, so a tool installed by Homebrew is routinely not found.
       */
      child.on('error', (error) => {
        clearTimeout(deadline);
        reject(error);
      });

      child.on('close', (code) => {
        clearTimeout(deadline);
        resolve({ code, stdout, stderr, timedOut });
      });
    });
  }
}
