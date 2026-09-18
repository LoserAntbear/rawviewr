import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function stripWildcard( /** @type {string} */ value) {
  return value.replace(/\/\*$/, '');
}

export function readTsconfigAliases(rootDir) {
  const { compilerOptions } = JSON.parse(readFileSync(resolve(rootDir, 'tsconfig.json'), 'utf8'));
  const baseUrl = resolve(rootDir, compilerOptions.baseUrl ?? '.');

  return Object.fromEntries(
    Object.entries(compilerOptions.paths ?? {}).map(([alias, [target]]) => [
      stripWildcard(alias),
      resolve(baseUrl, stripWildcard(target)),
    ]),
  );
}
