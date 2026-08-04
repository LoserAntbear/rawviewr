import { Endian, HeaderPreset, MAX_DIMENSION } from '../../definitions';
import { HeaderImplausibleError, HeaderTruncatedError } from './headerErrors';
import type { HeaderDimensions, HeaderLayout, DefinedHeaderedPreset } from '../types';

type OrderDescriptor = { msbAt: (fieldBytes: number) => number; step: number };

const BYTE_ORDER_DESCRIPTORS: Record<Endian, OrderDescriptor> = {
  [Endian.Big]: { msbAt: () => 0, step: 1 },
  [Endian.Little]: { msbAt: (fieldBytes) => fieldBytes - 1, step: -1 },
};

/** 1 Width + 1 height = 2 fields per header. Quick math. */
const FIELDS_PER_HEADER = 2;

const HEADER_LAYOUTS: Record<DefinedHeaderedPreset, HeaderLayout> = {
  [HeaderPreset.U16LE]: { endian: Endian.Little, fieldBytes: 2 },
  [HeaderPreset.U16BE]: { endian: Endian.Big, fieldBytes: 2 },
  [HeaderPreset.U32LE]: { endian: Endian.Little, fieldBytes: 4 },
  [HeaderPreset.U32BE]: { endian: Endian.Big, fieldBytes: 4 },
};

function isPlausibleDimension(value: number): boolean {
  return value > 0 && value <= MAX_DIMENSION;
}

function readFieldBytes(
  src: Uint8Array,
  offset: number,
  fieldBytes: number,
  endian: Endian,
): number {
  const { msbAt, step } = BYTE_ORDER_DESCRIPTORS[endian];
  const msb = msbAt(fieldBytes);

  let value = 0;

  for (let i = 0; i < fieldBytes; i++) {
    value = value * 256 + src[offset + msb + i * step];
  }

  return value;
}

function prepareDimensionValue(
  src: Uint8Array,
  offset: number,
  fieldBytes: number,
  endian: Endian,
  fieldName: 'width' | 'height',
): number {
  const value = readFieldBytes(src, offset, fieldBytes, endian);

  if (!isPlausibleDimension(value)) {
    throw new HeaderImplausibleError(value, fieldName);
  }

  return Math.floor(value);
}

/**
 * Reads the width/height pair a header preset describes.

 * @throws {HeaderError} when the buffer cannot satisfy the preset.
 */
export function resolveHeaderDimensions(
  src: Uint8Array,
  preset: DefinedHeaderedPreset,
): HeaderDimensions {
  const layout = HEADER_LAYOUTS[preset];

  if (!layout) {
    throw new Error(`No header layout registered for preset "${preset}".`);
  }

  const { endian, fieldBytes } = layout;
  const headerBytes = fieldBytes * FIELDS_PER_HEADER;

  if (src.length < headerBytes) {
    throw new HeaderTruncatedError(headerBytes, src.length);
  }

  const width = prepareDimensionValue(src, 0, fieldBytes, endian, 'width');
  const height = prepareDimensionValue(src, fieldBytes, fieldBytes, endian, 'height');

  return { width, height, headerBytes };
}
