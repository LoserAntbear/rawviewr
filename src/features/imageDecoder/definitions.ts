import { Endian } from '@definitions/bits';
import { DecodeOptions } from './types';

/** Upper bound for a decoded width or height, in pixels. */
export const MAX_DIMENSION = 65535;

export enum HeaderPreset {
  None = 'none',
  U16LE = 'u16le',
  U16BE = 'u16be',
  U32LE = 'u32le',
  U32BE = 'u32be',
}

export enum AlphaMode {
  Use = 'use',
  Ignore = 'ignore',
}

export const DEFAULT_DECODE_OPTIONS: DecodeOptions = {
  width: 0,
  frame: 0,
  height: 0,
  offset: 0,
  flipY: false,
  bytesPerRow: 0,
  bitOrderMsb: true,
  format: 'rgba4444', // TODO: Move formats to a separate enum and use it here. If possible.
  unpremultiply: false,
  endian: Endian.Little,
  alphaMode: AlphaMode.Use,
  headerPreset: HeaderPreset.None,
};
