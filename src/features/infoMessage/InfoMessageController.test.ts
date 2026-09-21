import { afterEach, describe, expect, it, vi } from 'vitest';
import { window } from 'vscode';

import { InfoMessageController } from './InfoMessageController';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InfoMessageController', () => {
  it.each([
    ['info', window.showInformationMessage],
    ['warn', window.showWarningMessage],
    ['error', window.showErrorMessage],
  ] as const)('shows a %s notification at once, with nothing for the caller to await', (level, show) => {
    expect(InfoMessageController.handleMessage({ level, message: 'hello' })).toBeUndefined();

    expect(show).toHaveBeenCalledWith('hello');
  });

  it('reports a notification that fails, rather than leaving it unhandled', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(window.showErrorMessage).mockRejectedValueOnce(new Error('no window'));

    InfoMessageController.showError('hello');

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith('Failed to show error message: Error: no window'));
  });
});
