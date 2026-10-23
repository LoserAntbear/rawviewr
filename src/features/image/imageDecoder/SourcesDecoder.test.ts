import { window, workspace } from 'vscode';

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '@features/appContext/AppContextProvider';
import type { FileSource } from '@features/viewer';

import { DEFAULT_DECODE_OPTIONS } from './definitions';
import { SourcesDecoder } from './SourcesDecoder';

/**
 * A decode is now cancellable, which it never used to be. What matters is how an abandoned one
 * leaves: quietly. Reported as an ordinary failure it would raise one VS Code notification per
 * file and paint every tile of the abandoned window as broken.
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

describe('SourcesDecoder.decodeFromSource', () => {
  it('decodes what it is given', async () => {
    const decoded = await decoder.decodeFromSource([source('a')], DEFAULT_DECODE_OPTIONS);

    expect(decoded.map(({ status }) => status)).toEqual(['success']);
  });

  it('reports a file it cannot read, and says so out loud', async () => {
    vi.mocked(workspace.fs.readFile).mockRejectedValue(new Error('gone'));

    const decoded = await decoder.decodeFromSource([source('a')], DEFAULT_DECODE_OPTIONS);

    expect(decoded.map(({ status }) => status)).toEqual(['failure']);
    expect(window.showErrorMessage).toHaveBeenCalled();
  });

  it('leaves an abandoned decode without a word, rather than as a failure', async () => {
    const run = new AbortController();

    run.abort();

    await expect(decoder.decodeFromSource([source('a')], DEFAULT_DECODE_OPTIONS, run.signal)).rejects.toThrow();
    expect(window.showErrorMessage).not.toHaveBeenCalled();
  });

  it('abandons mid-flight, once the window it was reading for has moved on', async () => {
    const run = new AbortController();

    vi.mocked(workspace.fs.readFile).mockImplementation(async () => {
      run.abort();

      return new Uint8Array(24) as never;
    });

    await expect(decoder.decodeFromSource([source('a')], DEFAULT_DECODE_OPTIONS, run.signal)).rejects.toThrow();
    expect(window.showErrorMessage).not.toHaveBeenCalled();
  });
});
