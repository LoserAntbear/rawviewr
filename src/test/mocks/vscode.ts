import { vi } from 'vitest';

/**
 * The slice of the `vscode` API that host-side code under test reaches for.
 *
 * `vscode` only exists inside the extension host, so tests resolve the import here through
 * a vitest alias. Each member is a `vi.fn()` a test can steer. Grow this when a test needs
 * more of the API, rather than mocking the whole surface up front.
 */
export const window = {
  activeTextEditor: undefined as { document: { uri: unknown } } | undefined,
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  showWarningMessage: vi.fn(),
};

export const workspace = {
  fs: { writeFile: vi.fn() },
  asRelativePath: vi.fn((target: { path: string }) => target.path),
};

export const commands = {
  executeCommand: vi.fn(),
};

/** A class, not an object: the code under test checks `instanceof vscode.Uri`. */
export class Uri {
  constructor(
    public readonly scheme: string,
    public readonly path: string,
  ) {}

  public static file(path: string): Uri {
    return new Uri('file', path);
  }

  public static from({ scheme, path }: { scheme: string; path: string }): Uri {
    return new Uri(scheme, path);
  }

  public static parse(value: string): Uri {
    const [scheme, ...path] = value.split(':');

    return new Uri(scheme, path.join(':'));
  }

  public static joinPath = vi.fn((base: { path: string }, ...segments: string[]) => ({
    path: [base.path, ...segments].join('/'),
  }));
}
