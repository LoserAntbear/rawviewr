import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Uri, window } from 'vscode';

import { resolveFolder } from './resolveFolder';
import { resolveUriTargets } from './resolveUriTargets';

const given = Uri.file('/work/buffers');
const picked = Uri.file('/picked');

beforeEach(() => {
  vi.mocked(window.showOpenDialog).mockResolvedValue([picked]);
});

describe('resolveFolder', () => {
  it('uses the folder it was given, without opening a picker', async () => {
    await expect(resolveFolder(given)).resolves.toBe(given);
    expect(window.showOpenDialog).not.toHaveBeenCalled();
  });

  it('opens a picker only when no folder was given', async () => {
    await expect(resolveFolder(null)).resolves.toBe(picked);
    expect(window.showOpenDialog).toHaveBeenCalledOnce();
  });
});

describe('resolveUriTargets', () => {
  it('uses the targets it was given, without opening a picker', async () => {
    await expect(resolveUriTargets([given])).resolves.toEqual([given]);
    expect(window.showOpenDialog).not.toHaveBeenCalled();
  });

  it('opens a picker only with no targets and no active document', async () => {
    await expect(resolveUriTargets([])).resolves.toEqual([picked]);
    expect(window.showOpenDialog).toHaveBeenCalledOnce();
  });
});
