import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

import LintUtils from './scripts/eslintUtils.mjs';

const pathGroups = LintUtils.importPathGroups();

export default defineConfig({
  // The build output is generated, and `eslint .` would otherwise lint both bundles.
  ignores: ['dist/**'],
}, {
  files: ['**/*.{js,mjs,ts}'],
  linterOptions: {
    // A disable comment that no longer suppresses anything is a claim that has gone stale.
    reportUnusedDisableDirectives: 'error',
  },
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
  ],
  plugins: { import: importPlugin },
  settings: {
    /**
     * `vscode` is handed to an extension by its host and is never installed, so it does not
     * resolve into node_modules. Left alone, `import/order` reads that as a project-internal
     * module and files it next to the aliases; it belongs at the top, with the builtins.
     */
    'import/core-modules': ['vscode'],
  },
  rules: {
    'no-restricted-syntax': [
      'error',
      // The rule is not so robust, but it will catch most cases of `disposables` being used in a class that does not extend `DisposableStore`.
      // Maybe I'll add some custom AST traversal logic in the future to make it more robust, but for now this should be good enough.
      {
        // The two stores own this field; the rule stands down for their files (see below),
        // which is why their names are not spelled into the selector.
        selector: ":matches(ClassDeclaration, ClassExpression):not([superClass.name='DisposableStore']) > ClassBody > PropertyDefinition[key.name='disposables'][value.type='ArrayExpression']",
        message: 'Restricted use of a raw `disposables` array. Extend `DisposableStore` (extension host) or hold a `WebviewDisposableStore` (webview) instead — both give safe, centralised cleanup.',
      },
    ],
    // `avoidEscape` so a string carrying an apostrophe keeps its double quotes instead of
    // growing backslashes.
    quotes: ['error', 'single', { avoidEscape: true }],
    'import/no-duplicates': 2,
    'no-bitwise': 'off',
    // `SwitchCase: 1` is not the rule's default, but it is how every switch here is written.
    'indent': ['error', 2, { SwitchCase: 1 }],
    // The merge fixer for duplicate imports leaves `A , B` behind; this cleans up after it.
    'comma-spacing': ['error', { before: false, after: true }],
    'comma-dangle': [
      'error',
      {
        'arrays': 'always-multiline',
        'objects': 'always-multiline',
        'imports': 'always-multiline',
        'exports': 'always-multiline',
        'functions': 'always-multiline',
      },
    ],
    /**
     * Members inside the braces, alphabetically. Declaration order is `import/order`'s job,
     * so it is left alone here — the two rules would otherwise disagree about it.
     */
    'sort-imports': ['error', {
      ignoreCase: true,
      ignoreDeclarationSort: true,
    }],
    'object-curly-spacing': ['error', 'always'],
    /**
     * Braces open and close the same way. Without this, merging two imports of one module
     * leaves `  LastMember } from '…'`, which `--fix` is happy with and nobody can read.
     */
    'object-curly-newline': ['error', {
      ImportDeclaration: { multiline: true, consistent: true },
      ExportDeclaration: { multiline: true, consistent: true },
    }],
    'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 1, maxEOF: 1 }],
    'max-len': [
      'error',
      {
        code: 120,
        tabWidth: 2,
        ignoreComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
    'no-shadow': 'off',
    'no-undef': 'off',
    'eol-last': 'error',
    'no-extra-boolean-cast': 'off',
    'no-useless-escape': 'off',
    'import/order':[
      'error',
      {
        pathGroups,
        /**
         * Empty on purpose. An alias like `@features/x` is shaped exactly like a scoped
         * package, so `import/order` types it `external` — and the default value of this
         * option excludes `external` from path-group matching, which drops the aliases and
         * the real third-party imports into one undifferentiated block.
         */
        pathGroupsExcludedImportTypes: [],
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'no-unused-vars': 'off',
  },
}, {
  files: ['src/**/*.ts'],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false, checkThenables: true }],
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'separate-type-imports' }],
    '@typescript-eslint/no-import-type-side-effects': 'error',

    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/explicit-member-accessibility': ['error', {
      accessibility: 'explicit',
      overrides: { constructors: 'no-public' },
    }],
  },
}, {
  files: ['src/domains/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@EXTENSION/*', '@WEBVIEW/*'],
          message: 'Shared code belongs to neither side. Move what both need into @SHARED.',
        },
      ],
    }],
  },
}, {
  files: ['src/domains/webview/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@EXTENSION/*'],
          message: 'The webview cannot reach the host. Ask over the bridge, or move the shared part into @SHARED.',
        },
      ],
    }],
  },
}, {
  files: ['src/domains/extension/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@WEBVIEW/*'],
          message: 'The view\'s internals are its own. Post it a message, or move the shared part into @SHARED.',
        },
      ],
    }],
  },
}, {
  files: ['src/domains/webview/**/*.ts'],
  // No carve-out for the host's half any more: it is `@EXTENSION/features/webviewHost` now,
  // so everything this points at really is webview code.
  ignores: ['**/*.test.ts'],
  rules: {
    '@typescript-eslint/no-restricted-imports': ['error', {
      paths: [
        { name: 'vscode', allowTypeImports: true, message: 'The webview has no vscode API. Ask the host over the message bridge.' },
        { name: '@features/buffer/BufferItem', message: 'Reads files through vscode.workspace.fs, which the webview cannot do.' },
        { name: '@features/file/FileValidator', message: 'Reads the app context, which only the extension host creates.' },
      ],
      patterns: [
        {
          group: ['@features/infoMessage/*', '@features/appContext/*'],
          allowTypeImports: true,
          message: 'Host-only: the webview posts an app:status message instead.',
        },
        {
          // Not even the webview host: it asks the host for bytes, it never reads them itself.
          group: ['fs', 'fs/*', 'path', 'os', 'child_process', 'node:*'],
          message: 'There is no file system in the webview. Request the bytes over the bridge.',
        },
      ],
    }],
  },
}, {
  files: [
    'src/domains/extension/features/disposable/DisposableStore.ts',
    'src/domains/shared/features/disposable/WebviewDisposableStore.ts',
  ],
  rules: { 'no-restricted-syntax': 'off' },
});
