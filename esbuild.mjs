import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

// region: path aliases
/**
 * Parsing path aliases from tsconfig.json to use them in esbuild config.
 *
 * @returns {Record<string, string>}
 */
function readTsconfigAliases() {
  const { compilerOptions } = JSON.parse(readFileSync(resolve(rootDir, 'tsconfig.json'), 'utf8'));
  const baseUrl = resolve(rootDir, compilerOptions.baseUrl ?? '.');
  const stripWildcard = (/** @type {string} */ value) => value.replace(/\/\*$/, '');

  return Object.fromEntries(
    Object.entries(compilerOptions.paths ?? {}).map(([alias, [target]]) => [
      stripWildcard(alias),
      resolve(baseUrl, stripWildcard(target))
    ])
  );
}

const alias = readTsconfigAliases();
// endregion

// region: esbuild problem matcher plugin
/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location == null) return;
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  }
};
// endregion

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// region: main
/** @type {import('esbuild').BuildOptions} */
const sharedConfig = {
  alias,
  bundle: true,
  logLevel: 'info',
  minify: production,
  sourcemap: !production,
  loader: { '.html': 'text', '.css': 'text' },
  plugins: [
    /* esbuildProblemMatcherPlugin should go to the end of plugins array */
    esbuildProblemMatcherPlugin
  ]
};

/** @type {import('esbuild').BuildOptions[]} */
const buildConfigs = [
  {
    ...sharedConfig,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    external: ['vscode'],
    outfile: 'dist/extension.js',
    entryPoints: ['src/extension.ts'],
  },
  {
    ...sharedConfig,
    format: 'iife',
    target: 'es2020',
    platform: 'browser',
    outfile: 'dist/webview/main.js',
    entryPoints: ['src/features/webview/main.ts'],
  },
];

/**
 *
 * @param {import('esbuild').BuildOptions[]} configs
 */
async function main(configs) {
  try {
    if (watch) {
      const contexts = await Promise.all(configs.map((b) => esbuild.context(b)));

      await Promise.all(contexts.map((c) => c.watch()));
    } else {
      await Promise.all(configs.map((b) => esbuild.build(b)));
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main(buildConfigs);
// endregion
