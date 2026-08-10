import type { AlphaMode } from '@features/image/imageDecoder/definitions';
import type { ViewerBackground } from '@features/viewer/definitions';

import {
  VIEWER_CONFIG_OPEN_TIME_KEYS,
  VIEWER_CONFIG_WATCHED_KEYS,
  VIEWER_CONFIG_DEFAULT_KEYS,
  EXTENSION_CONFIGURATION_KEY,
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

export type ViewerConfigWatchedKey = (typeof VIEWER_CONFIG_WATCHED_KEYS)[number];
export type ViewerConfigDefaultKey = (typeof VIEWER_CONFIG_DEFAULT_KEYS)[number];
export type ViewerConfigOpenTimeKey = (typeof VIEWER_CONFIG_OPEN_TIME_KEYS)[number];

/**
 * The subset that may be pushed into viewers that are already open.
 */
export type ViewerConfiguration = Pick<ViewerConfigSchema, ViewerConfigWatchedKey>;

export type ConfigChangePayload = {
  /**
   * Only the keys that actually changed, so consumers can ignore the rest.
   */
  keys: readonly ConfigKey[];
  /**
   * True when at least one presentation key moved — the only case open viewers care about.
   */
  affectsPresentation: boolean;
}

type AssertNever<T extends never> = T;

/**
 * package.json gives a setting that `ConfigSchema` has no definition for.
 */
export type _SchemaMissingKey = AssertNever<Exclude<ConfigKey, keyof ViewerConfigSchema>>;
/**
 * `ConfigSchema` types a setting that package.json has no definition for.
 */
export type _SchemaStaleKey = AssertNever<Exclude<keyof ViewerConfigSchema, ConfigKey>>;
/**
 * A setting was contributed without being classified in ./definitions.
 */
export type _UnclassifiedKey = AssertNever<
  Exclude<ConfigKey, ViewerConfigWatchedKey | ViewerConfigDefaultKey | ViewerConfigOpenTimeKey>
>;
/**
 * A group in ./definitions names something that is not a contributed setting.
 */
export type _MisspelledGroupKey = AssertNever<
  Exclude<ViewerConfigWatchedKey | ViewerConfigDefaultKey | ViewerConfigOpenTimeKey, ConfigKey>
>;
