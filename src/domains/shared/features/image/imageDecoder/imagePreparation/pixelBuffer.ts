import { FormatDecodersLibrary } from '@SHARED/features/image/format/rowDecoders';
import type { PixelFormat } from '@SHARED/features/image/format/types';

/**
 * Extend with strategies if needed in the future
 */
export function preparePixelBuffer(source: Uint8Array, format: PixelFormat): Uint8Array {
  return format.compressed
    ? FormatDecodersLibrary.getDecompressor(format.id).decompress(source)
    : source;
}
