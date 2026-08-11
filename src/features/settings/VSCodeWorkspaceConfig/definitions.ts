import { MAX_DIMENSION } from '@features/image/imageDecoder/definitions';
import { ViewerConfigKeySet } from './types';

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
const VIEWER_CONFIG_WATCHED_KEYS = ['background', 'tileSize'] as const;
/**
 * The keys we watch for changes ONLY while opening;
 * There's also a set of keys that we subscribe to for changes affecting an opened viewer and watch for.
 */
const VIEWER_CONFIG_ON_OPEN_KEYS = ['maxFileSizeMB', 'galleryIncludeGlob'] as const;

export enum ConfigChangeKind {
  ViewerOnOpen = 'viewer:onOpen',
  ViewerWatched = 'viewer:watched',
  ViewerDefaults = 'viewer:defaults',
}
export const VIEWER_CONFIG_KEYS: ViewerConfigKeySet = {
  all: [
    ...VIEWER_CONFIG_ON_OPEN_KEYS,
    ...VIEWER_CONFIG_WATCHED_KEYS,
    ...VIEWER_CONFIG_DEFAULT_KEYS,
  ],
  [ConfigChangeKind.ViewerOnOpen]: [...VIEWER_CONFIG_ON_OPEN_KEYS],
  [ConfigChangeKind.ViewerWatched]: [...VIEWER_CONFIG_WATCHED_KEYS],
  [ConfigChangeKind.ViewerDefaults]: [...VIEWER_CONFIG_DEFAULT_KEYS],
};
