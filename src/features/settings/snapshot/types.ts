import type { DecodeOptions } from '@features/image/imageDecoder/types';

/**
 * The list of the keys from `DecodeOptions` we want to be synced.
 * Extend if needed.
 */
export const PRESERVED_OPTION_KEYS = [
  'format',
  'endian',
  'flipY',
  'alphaMode',
  'bitOrderMsb',
  'unpremultiply',
  'headerPreset',
] as const satisfies readonly (keyof DecodeOptions)[];

export type PreservedOptionKey = typeof PRESERVED_OPTION_KEYS[number];
export type PreservedDecodeOptions = Pick<DecodeOptions, PreservedOptionKey>;
export type ToolbarOptionsSnapshot = {
  readonly preserved: boolean;
  readonly options: PreservedDecodeOptions;
};
