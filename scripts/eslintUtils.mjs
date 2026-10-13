import { readFileSync } from 'fs';
import path from 'path';

function parseTsConfigPath(pathName) {
  const pathNameDelimeter = '/';
  const patternSelectorAll = '/**';
  const pathNameSource = pathName.split(pathNameDelimeter)[0];

  return {
    pattern: pathNameSource + patternSelectorAll,
    group: 'internal',
  };
}

const EXCLUDE_ALIASES = [];

export function importPathGroups(tsConfigPath) {
  const configPath = tsConfigPath || path.resolve(import.meta.dirname, '../tsconfig.json');
  const tsconfig = JSON.parse(readFileSync(configPath, 'utf8'));
  const aliases = Object.keys(tsconfig.compilerOptions.paths) || [];
  const pathNames = aliases.filter((item) => !EXCLUDE_ALIASES.includes(item));

  return pathNames.map(parseTsConfigPath).filter(Boolean);
}

export default { importPathGroups };
