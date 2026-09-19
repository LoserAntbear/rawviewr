import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig({
  files: ['**/*.{js,ts}'],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
  ],
  rules: {
    "no-restricted-syntax": [
      "error",
      // The rule is not so robust, but it will catch most cases of `disposables` being used in a class that does not extend `DisposableStore`.
      // Maybe I'll add some custom AST traversal logic in the future to make it more robust, but for now this should be good enough.
      {
        // `DisposableStore` itself has no superClass (it `implements`, not `extends`), so
        // excluding by superClass alone still matches the base class's own field.
        "selector": ":matches(ClassDeclaration, ClassExpression):not([superClass.name='DisposableStore']):not([id.name='DisposableStore']):not([id.name='WebviewDisposableStore']) > ClassBody > PropertyDefinition[key.name='disposables'][value.type='ArrayExpression']",
        "message": "Restricted use of a raw `disposables` array. Extend `DisposableStore` (extension host) or hold a `WebviewDisposableStore` (webview) instead — both give safe, centralised cleanup."
      }
    ]
  }
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
  },
});
