import { readFileSync } from 'node:fs';
import * as vscode from 'vscode';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EXTENSION_DISPLAY_NAME } from '@definitions/extension';
import { DisposableRegistry } from '@EXTENSION/features/disposable/DisposableRegistry';
import { DisposableStore } from '@EXTENSION/features/disposable/DisposableStore';

import { Reporter } from './Reporter';

const NAME = 'Test Extension';

type Channel = {
  readonly lines: string[];
  readonly channel: vscode.OutputChannel;
  readonly shown: Parameters<vscode.OutputChannel['show']>[];
  readonly disposed: () => number;
};

function fakeChannel(): Channel {
  const lines: string[] = [];
  const shown: Parameters<vscode.OutputChannel['show']>[] = [];
  let disposals = 0;

  return {
    lines,
    shown,
    disposed: () => disposals,
    channel: {
      appendLine: (line: string) => {
        lines.push(line);
      },
      show: (...args: Parameters<vscode.OutputChannel['show']>) => {
        shown.push(args);
      },
      dispose: () => {
        disposals += 1;
      },
    } as unknown as vscode.OutputChannel,
  };
}

beforeEach(() => {
  DisposableStore.assignRegistry(new DisposableRegistry());
  vi.mocked(vscode.window.showErrorMessage).mockResolvedValue(undefined);
});

afterEach(() => {
  DisposableStore.assignRegistry(null);
});

describe('the running log', () => {
  it('appends every line it is given, in order', () => {
    const { channel, lines } = fakeChannel();

    new Reporter(NAME, channel).log('$ gpucapture start', 'wrote 1 trace');

    expect(lines).toEqual(['$ gpucapture start', 'wrote 1 trace']);
  });

  /** The drain of a tool's log spreads an array into it, and an empty one is the common case. */
  it('does nothing when given no lines', () => {
    const { channel, lines } = fakeChannel();

    new Reporter(NAME, channel).log();

    expect(lines).toEqual([]);
  });

  /**
   * `show(true)` preserves focus. Without the argument the channel steals the cursor, which is
   * wrong for output that is glanced at while something else is being typed.
   */
  it('shows the channel without taking focus', () => {
    const { channel, shown } = fakeChannel();

    new Reporter(NAME, channel).show();

    expect(shown).toEqual([[true]]);
  });

  it('names the channel after itself when it makes its own', () => {
    new Reporter(NAME);

    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(NAME);
  });

  it('disposes the channel it was given', () => {
    const { channel, disposed } = fakeChannel();

    new Reporter(NAME, channel).dispose();

    expect(disposed()).toBe(1);
  });
});

describe('bad news', () => {
  it('logs the reason and shows it to the user', () => {
    const { channel, lines } = fakeChannel();

    new Reporter(NAME, channel).failed('gpucapture exited with 1.');

    expect(lines).toEqual(['failed: gpucapture exited with 1.']);
    expect(vscode.window.showErrorMessage)
      .toHaveBeenCalledWith('Test Extension: gpucapture exited with 1.');
  });

  /**
   * Exactly one argument. A reporter reports; a message carrying buttons is a question, and
   * asking one belongs to `offerOptions` and to whoever knows what the buttons do.
   */
  it('offers nothing to do about it', () => {
    new Reporter(NAME, fakeChannel().channel).failed('gpucapture exited with 1.');

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.any(String));
  });
});

/**
 * The name reaches the user twice — as the channel's title and as the prefix on every
 * notification — and the manifest is JSON, so nothing but this reads one against the other.
 */
describe('the name the extension gives itself', () => {
  it('is the one the manifest shows in the marketplace', () => {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { displayName: string };

    expect(manifest.displayName).toBe(EXTENSION_DISPLAY_NAME);
  });
});
