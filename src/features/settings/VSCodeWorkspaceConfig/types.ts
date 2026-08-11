import type { AlphaMode } from '@features/image/imageDecoder/definitions';
import type { ViewerBackground } from '@features/viewer/definitions';

import {
  EXTENSION_CONFIGURATION_KEY,
  ConfigChangeKind,
} from './definitions';

type ManifestProps =
  typeof import('@packageRoot/package.json')['contributes']['configuration']['properties'];

/**
 * Every setting contributed in package.json, prefix stripped. Type-only import: nothing
 * is emitted, so the manifest never enters the bundle and `rootDir` is not violated.
 */
export type ConfigKey = Strip<keyof ManifestProps & string, typeof EXTENSION_CONFIGURATION_KEY>;

/**
 * We've got to define config schema as well by hand
 * Since parsing package.json cannot return concrete types (returns strings),
 * and we need to validate the values at runtime.
 */
export type ViewerConfigSchema = {
  tileSize: number;
  defaultWidth: number;
  defaultFormat: string;
  defaultHeight: number;
  defaultOffset: number;
  maxFileSizeMB: number;
  galleryIncludeGlob: string;
  defaultAlphaMode: AlphaMode;
  defaultLittleEndian: boolean;
  background: ViewerBackground;
}

export type ConfigValidator<K extends ConfigKey> = (raw: unknown) => ViewerConfigSchema[K] | null;
export type ConfigValidatorsMap = { [K in ConfigKey]: ConfigValidator<K> };

export type ViewerConfigKeySet<
  Kinds extends ConfigChangeKind = ConfigChangeKind,
  Keys extends ConfigKey = ConfigKey,
> = { all: Keys[]; } & { [K in Kinds]: Keys[] };

/**
 * The subset that may be pushed into viewers that are already open.
 */
export type ViewerConfiguration = Pick<ViewerConfigSchema, ViewerConfigKeySet[ConfigChangeKind.ViewerWatched][number]>;

export type ConfigChangePayload = {
  kind: ConfigChangeKind;
  keys: readonly ConfigKey[];
}
