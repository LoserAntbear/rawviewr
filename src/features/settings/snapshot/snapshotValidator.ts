import { MAX_FILE_DIMENSION_PX } from '@features/image/imageDecoder/definitions';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import { minBytesPerRow } from '@utils/bits';

/**
 * Whether remembered dimensions could describe a buffer of the given size.
 *
 * E.g. a 1024x1024 image with 4 bytes per pixel requires at least 1024 * 4 bytes per row.
 * Quick math.
 */
function doesOptionFitBuffer(options: DecodeOptions, availableBytes: number): boolean {
  const rowBytes = Math.max(minBytesPerRow(options.width, options.format.bpp), Math.floor(options.bytesPerRow) || 0);

  return options.width > 0
    && options.width <= MAX_FILE_DIMENSION_PX
    && rowBytes > 0
    && rowBytes * Math.max(1, options.height) <= Math.max(0, availableBytes - options.offset);
}

/**
 * Here we decide whether to keep the remembered *geometry* dimensions
 * or to reset them to zero if they cannot fit the available buffer.
 */
function toFittingOptions(options: DecodeOptions, availableBytes: number): DecodeOptions {
  return doesOptionFitBuffer(options, availableBytes)
    ? options
    : { ...options, width: 0, height: 0 };
}

/**
 * Have to compare by value rather than by identity.
 * Since the copy can be passed, can't rely on ref.
 */
function areSameOptions(current: DecodeOptions, next: DecodeOptions): boolean {
  const keys = Object.keys(current) as (keyof DecodeOptions)[];

  return keys.every((key) => (
    key === 'format' ? current.format.id === next.format.id : Object.is(current[key], next[key])
  ));
}

export const SnapshotValidator = {
  areSameOptions,
  toFittingOptions,
  doesOptionFitBuffer,
};
