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

export const VIEWER_CONFIG_KEYS = ['background', 'tileSize'] as const;
export const VIEWER_CONFIG_DEFAULT_KEYS = [
  'defaultFormat',
  'defaultWidth',
  'defaultHeight',
  'defaultOffset',
  'defaultLittleEndian',
  'defaultAlphaMode',
] as const;

/** Consulted while opening; a change cannot affect a buffer that is already loaded. */
export const OPEN_TIME_KEYS = ['maxFileSizeMB', 'galleryIncludeGlob'] as const;

/** Runtime counterpart of `ConfigKey` — the type is erased, `affectsConfiguration` is not. */
export const CONFIG_KEYS = [
  ...VIEWER_CONFIG_KEYS,
  ...VIEWER_CONFIG_DEFAULT_KEYS,
  ...OPEN_TIME_KEYS,
] as const;
