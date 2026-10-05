import { Endian } from '@definitions/bits';
import { BITS_PER_BYTE } from '@features/image/format/definitions';
import { readWord } from '@utils/bits';
import { BufferItem } from '@features/buffer/BufferItem';
import { FileSource } from '@features/webview/types';

import { SourceBytes, SourceLocation } from './types';

/** A fresh one each time, so a caller holding the result can't poison the next. */
function nothingToRead(): SourceBytes {
  return { bytes: [], value: null };
}

export class SourceReader {
  public read(source: Uint8Array, location: SourceLocation, endian: Endian): SourceBytes {
    const { bits, byteOffset, bitOffset } = location;

    return bits < BITS_PER_BYTE
      ? this.readWithinByte(source, byteOffset, bitOffset, bits)
      : this.readWholeBytes(source, byteOffset, bits / BITS_PER_BYTE, endian);
  }

  public async readFromFileSource(
    source: FileSource,
    location: SourceLocation,
    endian: Endian,
  ): Promise<SourceBytes> {
    const item = await BufferItem.fromFileSource(source);

    return this.read(new Uint8Array(item.data), location, endian);
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
