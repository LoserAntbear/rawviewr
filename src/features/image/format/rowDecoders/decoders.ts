import { expandTable, readWord } from '@utils/bits';
import { byKind, type KindStrategies } from '@utils/strategy';

import { BITS_PER_BYTE, OPAQUE_VALUE, PAD_CHANNEL, RowChannel } from '../definitions';
import {
  SubBits,
  GrayBits,
  FormatKind,
  FormatSpec,
  RowDecoder,
  ByteOrderEntry,
  PackedChannels,
  PackedWordBits,
} from '../types';
import { buildChannelReaders, buildEmptyRow } from './utils';

function buildPackedRowDecoder(bits: PackedWordBits, spec: PackedChannels): RowDecoder {
  const byteCount = bits / BITS_PER_BYTE;
  const channelReaders = buildChannelReaders(spec);

  return (source, byteOffset, pixelCount, options) => {
    const row = buildEmptyRow(pixelCount);
    const lastReadableByte = source.length - byteCount;

    let sourceIndex = byteOffset;
    let rowIndex = 0;

    for (let pixel = 0; pixel < pixelCount; pixel++, sourceIndex += byteCount, rowIndex += 4) {
      if (sourceIndex < 0 || sourceIndex > lastReadableByte) {
        continue;
      }

      const word = readWord(source, sourceIndex, byteCount, options.endian);

      /** Overwritten below when the spec carries an alpha field. */
      row[rowIndex + RowChannel.Alpha] = OPAQUE_VALUE;

      for (const { table, mask, wordShift, rowIndexShift } of channelReaders) {
        row[rowIndex + rowIndexShift] = table[(word >>> wordShift) & mask];
      }
    }

    return row;
  };
}

function buildByteOrderedRowDecoder(order: readonly ByteOrderEntry[]): RowDecoder {
  const byteCount = order.length;

  return (source, byteOffset, pixelCount) => {
    const row = buildEmptyRow(pixelCount);
    const lastReadableByte = source.length - byteCount;

    let sourceIndex = byteOffset;
    let rowIndex = 0;

    for (let pixel = 0; pixel < pixelCount; pixel++, sourceIndex += byteCount, rowIndex += 4) {
      if (sourceIndex < 0 || sourceIndex > lastReadableByte) {
        continue;
      }

      row[rowIndex + RowChannel.Alpha] = OPAQUE_VALUE;

      for (let byte = 0; byte < byteCount; byte++) {
        const channel = order[byte];

        if (channel !== PAD_CHANNEL) {
          row[rowIndex + channel] = source[sourceIndex + byte];
        }
      }
    }

    return row;
  };
}

function buildSubByteGrayRowDecoder(bits: SubBits): RowDecoder {
  const pixelsPerByte = BITS_PER_BYTE / bits;
  const mask = (1 << bits) - 1;
  const table = expandTable(bits);

  return (source, byteOffset, pixelCount, options) => {
    const row = buildEmptyRow(pixelCount);

    let rowIndex = 0;

    for (let pixel = 0; pixel < pixelCount; pixel++, rowIndex += 4) {
      const sourceIndex = byteOffset + Math.floor(pixel / pixelsPerByte);

      if (sourceIndex < 0 || sourceIndex >= source.length) {
        continue;
      }

      const subPixel = pixel % pixelsPerByte;
      const shift = options.bitOrderMsb
        ? BITS_PER_BYTE - bits - subPixel * bits
        : subPixel * bits;
      const luminance = table[(source[sourceIndex] >>> shift) & mask];

      row[rowIndex + RowChannel.Red] = luminance;
      row[rowIndex + RowChannel.Green] = luminance;
      row[rowIndex + RowChannel.Blue] = luminance;
      row[rowIndex + RowChannel.Alpha] = OPAQUE_VALUE;
    }

    return row;
  };
}

/** A 16-bit sample is shown by its high byte, so the two gray widths differ only in step. */
function buildGrayRowDecoder(bits: GrayBits): RowDecoder {
  const byteCount = bits / BITS_PER_BYTE;

  return (source, byteOffset, pixelCount, options) => {
    const row = buildEmptyRow(pixelCount);
    const lastReadableByte = source.length - byteCount;

    let sourceIndex = byteOffset;
    let rowIndex = 0;

    for (let pixel = 0; pixel < pixelCount; pixel++, sourceIndex += byteCount, rowIndex += 4) {
      if (sourceIndex < 0 || sourceIndex > lastReadableByte) {
        continue;
      }

      const word = readWord(source, sourceIndex, byteCount, options.endian);
      const luminance = word >>> (bits - BITS_PER_BYTE);

      row[rowIndex + RowChannel.Red] = luminance;
      row[rowIndex + RowChannel.Green] = luminance;
      row[rowIndex + RowChannel.Blue] = luminance;
      row[rowIndex + RowChannel.Alpha] = OPAQUE_VALUE;
    }

    return row;
  };
}

/** 8-bit alpha with no colour: the sample drives opacity over white. */
function buildAlphaRowDecoder(): RowDecoder {
  return (source, byteOffset, pixelCount) => {
    const row = buildEmptyRow(pixelCount);

    let sourceIndex = byteOffset;
    let rowIndex = 0;

    for (let pixel = 0; pixel < pixelCount; pixel++, sourceIndex++, rowIndex += 4) {
      if (sourceIndex < 0 || sourceIndex >= source.length) {
        continue;
      }

      row[rowIndex + RowChannel.Red] = OPAQUE_VALUE;
      row[rowIndex + RowChannel.Green] = OPAQUE_VALUE;
      row[rowIndex + RowChannel.Blue] = OPAQUE_VALUE;
      row[rowIndex + RowChannel.Alpha] = source[sourceIndex];
    }

    return row;
  };
}

const ROW_DECODER_BY_SPEC: KindStrategies<FormatSpec, [], RowDecoder> = {
  [FormatKind.Alpha]: () => buildAlphaRowDecoder(),
  [FormatKind.Gray]: ({ bits }) => buildGrayRowDecoder(bits),
  [FormatKind.SubByteGray]: ({ bits }) => buildSubByteGrayRowDecoder(bits),
  [FormatKind.ByteOrdered]: ({ order }) => buildByteOrderedRowDecoder(order),
  [FormatKind.Packed]: ({ bits, channels }) => buildPackedRowDecoder(bits, channels),
};

export function buildRowDecoder(spec: FormatSpec): RowDecoder {
  return byKind(ROW_DECODER_BY_SPEC, spec);
}
