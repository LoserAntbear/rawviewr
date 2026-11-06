import * as vscode from 'vscode';

import { beforeEach, describe, expect, it } from 'vitest';

import type { ConfigKey, ConfigReader, ViewerConfigSchema } from '@SHARED/features/settings/configuration/types';

import { CaptureToolProvider } from './CaptureToolProvider';
import { ConfiguredCaptureTool } from './platforms/configured/ConfiguredCaptureTool';

const ON_DARWIN = process.platform === 'darwin';

/**
 * A reader that holds only the two keys the provider is entitled to. Reaching for a third
 * throws rather than returning undefined, so the provider growing a dependency on some other
 * setting shows up here as a failure instead of as a silent default.
 */
function reader(command: string, args: readonly string[] = []): ConfigReader {
  const values: Partial<Record<ConfigKey, unknown>> = {
    'capture.command': command,
    'capture.args': args,
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
    const tool = new CaptureToolProvider(reader('')).getActiveTool();

    expect(tool?.container).toBe('.gputrace');
    expect(tool).not.toBeInstanceOf(ConfiguredCaptureTool);
  });

  /**
   * Linux and Windows have no built-in tool yet, and being told so beats a placeholder command
   * name that reads as a configured tool right up to the ENOENT.
   */
  it.skipIf(ON_DARWIN)('has nothing to offer on a platform we do not ship a tool for', () => {
    expect(new CaptureToolProvider(reader('')).getActiveTool()).toBeNull();
  });

  it('hands over to a configured command as soon as there is one', () => {
    const tool = new CaptureToolProvider(reader('ffmpeg', ['-f', 'x11grab'])).getActiveTool();

    expect(tool).toBeInstanceOf(ConfiguredCaptureTool);
    expect(tool?.label).toBe('ffmpeg');
  });

  /** Whitespace is nothing configured — otherwise a stray space disables the built-in tool. */
  it.runIf(ON_DARWIN)('reads a command of spaces as nothing configured', () => {
    expect(new CaptureToolProvider(reader('   ')).getActiveTool())
      .not.toBeInstanceOf(ConfiguredCaptureTool);
  });

  /**
   * Settings cannot know what is running, so a configured argv asking for `${pid}` is filled
   * from the platform tool's own listing. Where there is no platform tool there is nothing to
   * borrow, and the configured tool says that rather than substituting something.
   */
  it('lends a configured tool the platform tool\'s process list, where there is one', () => {
    const tool = new CaptureToolProvider(reader('gpucapture', ['-p', '${pid}'])).getActiveTool();

    expect(typeof tool?.listTargets === 'function').toBe(ON_DARWIN);
  });

  it('writes a raw buffer for a configured tool, since that is what the viewer opens', () => {
    expect(new CaptureToolProvider(reader('ffmpeg')).getActiveTool()?.container).toBe('.raw');
  });
});
