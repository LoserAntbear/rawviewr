import { expandTable, readWord } from '@utils/bits';
import { buildChannelReaders } from './utils';
import { PAD_CHANNEL, CHANNEL_LETTERS } from '../definitions';
import {
  SubBits,
  FullBits,
  GrayBits,
  FormatKind,
  PixelFormat,
  ByteOrderEntry,
  PackedChannels,
  PackedWordBits,
  FormatDefinition,
} from '../types';
import { BITS_PER_BYTE, FormatGroup, OPAQUE_VALUE, RowChannel, PACKED_GROUPS } from '../definitions';
import { buildEmptyRow, buildLabel } from './utils';

export function buildPackedFormat(
  id: string,
  bits: PackedWordBits,
  spec: PackedChannels,
  label?: string,
): PixelFormat {
  const byteCount = bits / BITS_PER_BYTE;
  const channelReaders = buildChannelReaders(spec);

  return {
    id,
    bpp: bits,
    label: label ?? buildLabel(id),
    group: PACKED_GROUPS[bits],
    hasAlpha: !!spec.a,
    endianSensitive: byteCount > 1,
    bitOrderSensitive: false,

    decodeRow(source, byteOffset, pixelCount, options) {
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
    },
  };
}

export function buildByteOrderedFormat(
  id: string,
  order: readonly ByteOrderEntry[],
  label?: string,
): PixelFormat {
  const byteCount = order.length;
  const layout = order
    .map((channel) => (channel === PAD_CHANNEL ? 'pad' : CHANNEL_LETTERS[channel]))
    .join(',');

  return {
    id,
    bpp: (byteCount * BITS_PER_BYTE) as FullBits,
    label: label ?? buildLabel(id, `bytes ${layout}`),
    group: byteCount === 3 ? FormatGroup.Packed24 : FormatGroup.Packed32,
    hasAlpha: order.includes(RowChannel.Alpha),
    endianSensitive: false,
    bitOrderSensitive: false,

    decodeRow(source, byteOffset, pixelCount) {
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
    },
  };
}

export function buildSubByteGrayFormat(id: string, bits: SubBits, label?: string): PixelFormat {
  const pixelsPerByte = BITS_PER_BYTE / bits;
  const mask = (1 << bits) - 1;
  const table = expandTable(bits);

  return {
    id,
    bpp: bits,
    label: label ?? buildLabel(id, `${bits}-bit, ${pixelsPerByte} px/byte`),
    group: FormatGroup.SubByte,
    hasAlpha: false,
    endianSensitive: false,
    bitOrderSensitive: true,

    decodeRow(source, byteOffset, pixelCount, options) {
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
    },
  };
}

/**
 * 8- or 16-bit luminance. A 16-bit sample is shown by its high byte, so the two
 * differ only in how wide a step they take and whether byte order matters.
 */
export function buildGrayFormat(id: string, bits: GrayBits, label?: string): PixelFormat {
  const byteCount = bits / BITS_PER_BYTE;
  const detail = bits > BITS_PER_BYTE
    ? `${bits}-bit luminance (high byte shown)`
    : `${bits}-bit luminance`;

  return {
    id,
    bpp: bits,
    label: label ?? buildLabel(id, detail),
    group: FormatGroup.Grayscale,
    hasAlpha: false,
    endianSensitive: byteCount > 1,
    bitOrderSensitive: false,

    decodeRow(source, byteOffset, pixelCount, options) {
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
    },
  };
}

/** 8-bit alpha with no colour: the sample drives opacity over white. */
export function buildAlphaFormat(id: string, label?: string): PixelFormat {
  return {
    id,
    bpp: 8,
    label: label ?? buildLabel(id, '8-bit alpha only'),
    group: FormatGroup.Grayscale,
    hasAlpha: true,
    endianSensitive: false,
    bitOrderSensitive: false,

    decodeRow(source, byteOffset, pixelCount) {
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
    },
  };
}

export function buildFormat({ id, spec, label }: FormatDefinition): PixelFormat {
  switch (spec.kind) {
    case FormatKind.Packed:
      return buildPackedFormat(id, spec.bits, spec.channels, label);

    case FormatKind.ByteOrdered:
      return buildByteOrderedFormat(id, spec.order, label);

    case FormatKind.SubByteGray:
      return buildSubByteGrayFormat(id, spec.bits, label);

    case FormatKind.Gray:
      return buildGrayFormat(id, spec.bits, label);

    case FormatKind.Alpha:
      return buildAlphaFormat(id, label);
  }
}
