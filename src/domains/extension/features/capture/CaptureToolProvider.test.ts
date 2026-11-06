import * as vscode from 'vscode';

import { beforeEach, describe, expect, it } from 'vitest';

import { CaptureOutputType } from '@definitions/capture';
import type { ConfigKey, ConfigReader, ViewerConfigSchema } from '@SHARED/features/settings/configuration/types';

import { CaptureToolProvider } from './CaptureToolProvider';
import { ConfiguredCaptureTool } from './platforms/configured/ConfiguredCaptureTool';

const ON_DARWIN = process.platform === 'darwin';

type CaptureSettings = {
  readonly command: string;
  readonly args?: readonly string[];
  readonly outputType?: CaptureOutputType;
};

/**
 * A reader that holds only the three keys the provider is entitled to. Reaching for a fourth
 * throws rather than returning undefined, so the provider growing a dependency on some other
 * setting shows up here as a failure instead of as a silent default.
 */
function reader({ command, args = [], outputType = CaptureOutputType.File }: CaptureSettings): ConfigReader {
  const values: Partial<Record<ConfigKey, unknown>> = {
    'capture.command': command,
    'capture.args': args,
    'capture.outputType': outputType,
  };

  return {
    onDidChange: () => ({ dispose: () => undefined }),
    read: <K extends ConfigKey>(key: K): ViewerConfigSchema[K] => {
      if (!(key in values)) {
        throw new Error(`the provider read ${key}, which is not its business`);
      }

      return values[key] as ViewerConfigSchema[K];
    },
  };
}

const provider = (settings: CaptureSettings): CaptureToolProvider => (
  new CaptureToolProvider(reader(settings))
);

/** `workspaceFolders` is readonly in the real API, so the mock's copy is set through a cast. */
function openFolder(fsPath: string | null): void {
  const workspace = vscode.workspace as { workspaceFolders?: unknown };

  workspace.workspaceFolders = fsPath === null ? undefined : [{ uri: { fsPath } }];
}

describe('choosing which tool a capture runs with', () => {
  beforeEach(() => {
    openFolder(null);
  });

  /**
   * The default, and the whole point of shipping a tool per platform: pressing the button on a
   * fresh install has to do something without a trip through settings first.
   */
  it.runIf(ON_DARWIN)('uses the platform tool when nothing is configured', () => {
    const tool = provider({ command: '' }).getActiveTool();

    expect(tool?.containerFormat).toBe('.gputrace');
    expect(tool).not.toBeInstanceOf(ConfiguredCaptureTool);
  });

  /**
   * Linux and Windows have no built-in tool yet, and being told so beats a placeholder command
   * name that reads as a configured tool right up to the ENOENT.
   */
  it.skipIf(ON_DARWIN)('has nothing to offer on a platform we do not ship a tool for', () => {
    expect(provider({ command: '' }).getActiveTool()).toBeNull();
  });

  it('hands over to a configured command as soon as there is one', () => {
    const tool = provider({ command: 'ffmpeg', args: ['-f', 'x11grab'] }).getActiveTool();

    expect(tool).toBeInstanceOf(ConfiguredCaptureTool);
    expect(tool?.label).toBe('ffmpeg');
  });

  /** Whitespace is nothing configured — otherwise a stray space disables the built-in tool. */
  it.runIf(ON_DARWIN)('reads a command of spaces as nothing configured', () => {
    expect(provider({ command: '   ' }).getActiveTool()).not.toBeInstanceOf(ConfiguredCaptureTool);
  });
});

describe('what a configured tool is told to produce', () => {
  it('writes a raw buffer under outputType file, since that is what the viewer opens', () => {
    const tool = provider({ command: 'ffmpeg', outputType: CaptureOutputType.File }).getActiveTool();

    expect(tool?.containerFormat).toBe('.raw');
  });

  /** No container means no path: such a tool streams the frame and is given nowhere to write. */
  it('declares no container under outputType stdout', () => {
    const tool = provider({ command: 'ffmpeg', outputType: CaptureOutputType.Stdout }).getActiveTool();

    expect(tool?.containerFormat).toBeNull();
  });
});

describe('finding out what can be captured', () => {
  /**
   * Keyed by platform and never by settings: what is capturable depends on the machine, not on
   * whose tool is doing the capturing, so a configured tool asking for `${pid}` gets exactly the
   * answer the built-in one would.
   */
  it.runIf(ON_DARWIN)('has a resolver on macOS, whichever tool is active', () => {
    expect(provider({ command: '' }).currentPlatformTargetResolver).not.toBeNull();
    expect(provider({ command: 'ffmpeg' }).currentPlatformTargetResolver).not.toBeNull();
  });

  it.skipIf(ON_DARWIN)('has none on a platform without one', () => {
    expect(provider({ command: '' }).currentPlatformTargetResolver).toBeNull();
  });
});
