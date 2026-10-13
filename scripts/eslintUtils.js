const path = require('path');

function parseTsConfigPath(pathName) {
  const pathNameDelimeter = '/';
  const patternSelectorAll = '/**';
  const pathNameSource = pathName.split(pathNameDelimeter)[0];

  return {
    pattern: pathNameSource + patternSelectorAll,
    group: 'internal',
    position: 'after',
  };
}

// TODO: Add function for fetching aliases from yarn workspaces command
const EXCLUDE_ALIASES = [];

function importPathGroups(tsConfigPath) {
  const configPath = tsConfigPath || path.resolve(__dirname, '../tsconfig.json');
  const tsconfig = require(configPath);
  const pathNames = Object.keys(tsconfig.compilerOptions.paths)?.filter((item) => !EXCLUDE_ALIASES.includes(item) ) || [];

  return pathNames.map(parseTsConfigPath).filter(Boolean);
}

module.exports = {
  importPathGroups,
};
