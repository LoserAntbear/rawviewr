import { MAX_DIMENSION } from '@features/image/imageDecoder/definitions';

export const EXTENSION_CONFIGURATION_KEY = 'rawImageViewer';

export const DIMENSION_LIMITS_PX = { min: 0, max: MAX_DIMENSION } as const;
export const BYTE_OFFSET_LIMITS = { min: 0, max: Number.MAX_SAFE_INTEGER } as const;
/**
 * TODO: Connect to the UI toolbar input
 */
export const TILE_SIZE_LIMITS_PX = { min: 48, max: 512 } as const;
/** --- Just a sanity check rather than a strict limit. 4GB is an image huge enough */
export const FILE_SIZE_LIMITS_MB = { min: 1, max: 4096 } as const;

export const VIEWER_CONFIG_DEFAULT_KEYS = [
  'defaultFormat',
  'defaultWidth',
  'defaultHeight',
  'defaultOffset',
  'defaultAlphaMode',
  'defaultLittleEndian',
] as const;
/**
 * The keys we watch for changes that may affect an opened viewer.
 * There's also a set of keys that are consulted at open time ONLY.
 */
export const VIEWER_CONFIG_WATCHED_KEYS = ['background', 'tileSize'] as const;
/**
 * The keys we watch for changes ONLY while opening;
 * There's also a set of keys that we subscribe to for changes affecting an opened viewer and watch for.
 */
export const OPEN_TIME_KEYS = ['maxFileSizeMB', 'galleryIncludeGlob'] as const;

/**
 * Barrel export of all keys, so consumers can iterate over them without having to know which are watched and which are open-time-only.
 */
export const CONFIG_KEYS = [
  ...OPEN_TIME_KEYS,
  ...VIEWER_CONFIG_WATCHED_KEYS,
  ...VIEWER_CONFIG_DEFAULT_KEYS,
] as const;
