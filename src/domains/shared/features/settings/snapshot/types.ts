import type { DecodeOptions } from '@SHARED/features/image/imageDecoder/types';

/**
 * The list of the keys from `DecodeOptions` we want to be synced.
 * Extend if needed.
 */
export const PRESERVED_OPTION_KEYS = [
  'flipY',
  'format',
  'endian',
  'alphaMode',
  'bitOrderMsb',
  'headerPreset',
  'unpremultiply',
] as const satisfies readonly (keyof DecodeOptions)[];

export type PreservedOptionKey = typeof PRESERVED_OPTION_KEYS[number];
export type PreservedDecodeOptions = Pick<DecodeOptions, PreservedOptionKey>;
export type ToolbarOptionsSnapshot = {
  readonly preserved: boolean;
  readonly options: PreservedDecodeOptions;
};
