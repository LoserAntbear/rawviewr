import { ConfigChangeKind } from './definitions';
import { ConfigKey, ViewerConfigKeySet } from './types';

export function detectConfigKeyChangeKind(
  key: ConfigKey,
  keySet: ViewerConfigKeySet,
  changeKinds: typeof ConfigChangeKind = ConfigChangeKind,
): ConfigChangeKind {
  const changeKind = Object.values(changeKinds).find((kind) => keySet[kind].includes(key));

  if (!changeKind) {
    throw new Error(`Config key ${key} is not registered in any change kind.`);
  }

  return changeKind;
}