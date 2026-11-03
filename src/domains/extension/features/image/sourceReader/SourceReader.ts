import type { Endian } from '@definitions/bits';
import { BufferItem } from '@EXTENSION/features/buffer/BufferItem';
import { BITS_PER_BYTE } from '@SHARED/features/image/format/definitions';
import type { PixelFormat } from '@SHARED/features/image/format/types';
import { resolveEndian } from '@SHARED/features/image/format/utils';
import { preparePixelBuffer } from '@SHARED/features/image/imageDecoder/imagePreparation/pixelBuffer';
import type { SourceBytes, SourceLocation } from '@SHARED/features/image/sourceReader/types';
import type { FileSource } from '@SHARED/features/viewer/types';
import { readWord } from '@utils/bits';

/** A fresh one each time, so a caller holding the result can't poison the next. */
function nothingToRead(): SourceBytes {
  return { bytes: [], value: null };
}

export class SourceReader {
  // Non-endian sesitive are resolved to LE by default.
  public read(
    source: Uint8Array,
    location: SourceLocation,
    endian: Endian,
    format: PixelFormat,
  ): SourceBytes {
    const pixels = preparePixelBuffer(source, format);
    const { bits, byteOffset, bitOffset } = location;

    return bits < BITS_PER_BYTE
      ? this.readWithinByte(pixels, byteOffset, bitOffset, bits)
      : this.readWholeBytes(pixels, byteOffset, bits / BITS_PER_BYTE, resolveEndian(format, endian));
  }

  public async readFromFileSource(
    source: FileSource,
    location: SourceLocation,
    endian: Endian,
    format: PixelFormat,
  ): Promise<SourceBytes> {
    const item = await BufferItem.fromFileSource(source);

    return this.read(new Uint8Array(item.data), location, endian, format);
  }

  /** Sub-byte formats share a byte between pixels, so only some bits are ours. */
  private readWithinByte(
    source: Uint8Array,
    byteOffset: number,
    bitOffset: number,
    bits: number,
  ): SourceBytes {
    if (byteOffset < 0 || byteOffset >= source.length) {
      return nothingToRead();
    }

    const byte = source[byteOffset];

    return { bytes: [byte], value: (byte >>> bitOffset) & ((1 << bits) - 1) };
  }

  private readWholeBytes(
    source: Uint8Array,
    byteOffset: number,
    byteCount: number,
    endian: Endian,
  ): SourceBytes {
    if (byteOffset < 0 || byteOffset + byteCount > source.length) {
      return nothingToRead();
    }

    return {
      bytes: [...source.subarray(byteOffset, byteOffset + byteCount)],
      value: readWord(source, byteOffset, byteCount, endian),
    };
  }

}
