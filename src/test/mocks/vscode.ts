import { vi } from 'vitest';

/**
 * The slice of the `vscode` API that host-side code under test reaches for.
 *
 * `vscode` only exists inside the extension host, so tests resolve the import here through
 * a vitest alias. Each member is a `vi.fn()` a test can steer. Grow this when a test needs
 * more of the API, rather than mocking the whole surface up front.
 */
export const window = {
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showSaveDialog: vi.fn(),
};

export const workspace = {
  fs: { writeFile: vi.fn() },
  asRelativePath: vi.fn((target: { path: string }) => target.path),
};

export const commands = {
  executeCommand: vi.fn(),
};

export const Uri = {
  joinPath: vi.fn((base: { path: string }, ...segments: string[]) => ({
    path: [base.path, ...segments].join('/'),
  })),
};
