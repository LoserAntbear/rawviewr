import { expandTable, readWord } from '@utils/bits';
import { byKind, type KindStrategies } from '@utils/strategy';

import { BITS_PER_BYTE, OPAQUE_VALUE, PAD_CHANNEL, RowChannel } from '../definitions';
import type {
  ByteOrderEntry,
  FormatSpec,
  GrayBits,
  PackedChannels,
  PackedWordBits,
  RowDecoder,
  SubBits,
  Yuv422Order,
  Yuv444Order,
} from '../types';
import { FormatKind } from '../types';

import { buildChannelReaders, buildEmptyRow } from './utils';
import { writeYuvPixel } from './yuv';

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

// Four bytes carry two pixels, and they share one chroma pair. That is what 4:2:2 means.
const YUV422_GROUP_BYTES = 4 as const;
const ROW_SLOTS_PER_PIXEL = 4 as const;

function buildYuv422RowDecoder(order: Yuv422Order): RowDecoder {
  const y0At = order.indexOf('y0');
  const y1At = order.indexOf('y1');
  const uAt = order.indexOf('u');
  const vAt = order.indexOf('v');

  return (source, byteOffset, pixelCount) => {
    const row = buildEmptyRow(pixelCount);
    const lastReadableByte = source.length - YUV422_GROUP_BYTES;

    let sourceIndex = byteOffset;
    let rowIndex = 0;

    for (
      let pixel = 0;
      pixel < pixelCount;
      pixel += 2, sourceIndex += YUV422_GROUP_BYTES, rowIndex += ROW_SLOTS_PER_PIXEL * 2
    ) {
      if (sourceIndex < 0 || sourceIndex > lastReadableByte) {
        continue;
      }

      const u = source[sourceIndex + uAt];
      const v = source[sourceIndex + vAt];

      writeYuvPixel(row, rowIndex, source[sourceIndex + y0At], u, v);

      if (pixel + 1 < pixelCount) {
        writeYuvPixel(row, rowIndex + ROW_SLOTS_PER_PIXEL, source[sourceIndex + y1At], u, v);
      }
    }

    return row;
  };
}

// One pixel per three bytes: nothing is shared, so there is no pairing to get wrong.
const YUV444_PIXEL_BYTES = 3 as const;

function buildYuv444RowDecoder(order: Yuv444Order): RowDecoder {
  const yAt = order.indexOf('y');
  const uAt = order.indexOf('u');
  const vAt = order.indexOf('v');

  return (source, byteOffset, pixelCount) => {
    const row = buildEmptyRow(pixelCount);
    const lastReadableByte = source.length - YUV444_PIXEL_BYTES;

    let sourceIndex = byteOffset;
    let rowIndex = 0;

    for (
      let pixel = 0;
      pixel < pixelCount;
      pixel += 1, sourceIndex += YUV444_PIXEL_BYTES, rowIndex += ROW_SLOTS_PER_PIXEL
    ) {
      if (sourceIndex < 0 || sourceIndex > lastReadableByte) {
        continue;
      }

      writeYuvPixel(
        row,
        rowIndex,
        source[sourceIndex + yAt],
        source[sourceIndex + uAt],
        source[sourceIndex + vAt],
      );
    }

    return row;
  };
}

const ROW_DECODER_BY_SPEC: KindStrategies<FormatSpec, [], RowDecoder> = {
  [FormatKind.Alpha]: () => buildAlphaRowDecoder(),
  [FormatKind.Gray]: ({ bits }) => buildGrayRowDecoder(bits),
  [FormatKind.PackedYuv422]: ({ order }) => buildYuv422RowDecoder(order),
  [FormatKind.PackedYuv444]: ({ order }) => buildYuv444RowDecoder(order),
  [FormatKind.SubByteGray]: ({ bits }) => buildSubByteGrayRowDecoder(bits),
  [FormatKind.ByteOrdered]: ({ order }) => buildByteOrderedRowDecoder(order),
  [FormatKind.Packed]: ({ bits, channels }) => buildPackedRowDecoder(bits, channels),
};

export function buildRowDecoder(spec: FormatSpec): RowDecoder {
  return byKind(ROW_DECODER_BY_SPEC, spec);
}
