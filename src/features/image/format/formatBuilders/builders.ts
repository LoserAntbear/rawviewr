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
import { BITS_PER_BYTE, FormatGroup, RowChannel, PACKED_GROUPS } from '../definitions';
import { buildLabel } from './utils';

export function buildPackedFormat(
  id: string,
  bits: PackedWordBits,
  spec: PackedChannels,
  label?: string,
): PixelFormat {
  const byteCount = bits / BITS_PER_BYTE;

  return {
    id,
    bpp: bits,
    label: label ?? buildLabel(id),
    group: PACKED_GROUPS[bits],
    hasAlpha: !!spec.a,
    endianSensitive: byteCount > 1,
    bitOrderSensitive: false,
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
  };
}

export function buildSubByteGrayFormat(id: string, bits: SubBits, label?: string): PixelFormat {
  const pixelsPerByte = BITS_PER_BYTE / bits;

  return {
    id,
    bpp: bits,
    label: label ?? buildLabel(id, `${bits}-bit, ${pixelsPerByte} px/byte`),
    group: FormatGroup.SubByte,
    hasAlpha: false,
    endianSensitive: false,
    bitOrderSensitive: true,
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
