import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { readTsconfigAliases } from './tsconfig-aliases.mjs';

const rootDir = dirname(fileURLToPath(import.meta.url));

/**
 * esbuild loads `.html` and `.css` as plain text.
 * Vite treats `.css` as a stylesheet
 * Rewriting both to Vite's own `?raw` loader — to return the file as a string
 *
 * @type {import('vite').Plugin}
 */
const textImports = {
  name: 'riv:text-imports',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (!/\.(html|css)$/.test(source)) {
      return null;
    }

    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });

    return resolved ? `${resolved.id}?raw` : null;
  },
};

export default defineConfig({
  plugins: [textImports],
  resolve: {
    alias: {
      ...readTsconfigAliases(rootDir),
      vscode: resolve(rootDir, 'src/test/mocks/vscode.ts'),
    },
  },
  test: {
    clearMocks: true,
    // From two esbuild targets:
    // - webview bundle (runs in a browser)
    // - extension host in Node
    projects: [
      {
        extends: true,
        test: {
          name: 'webview',
          environment: 'happy-dom',
          include: ['src/features/webview/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'host',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/features/webview/**'],
        },
      },
    ],
  },
});
