import { Endian } from '@definitions/bits';

const LOOKUP_CACHE_TABLES = new Map<number, Uint8Array>();

export function expandTable(bits: number): Uint8Array {
  let table = LOOKUP_CACHE_TABLES.get(bits);

  if (!table) {
    const max = (1 << bits) - 1;

    table = new Uint8Array(max + 1);

    for (let value = 0; value <= max; value++) {
      table[value] = Math.round((value * 255) / max);
    }

    LOOKUP_CACHE_TABLES.set(bits, table);
  }

  return table;
}

type ByteOrderDescriptor = { msbAt: (byteCount: number) => number; step: number };

const BYTE_ORDER_DESCRIPTORS: Record<Endian, ByteOrderDescriptor> = {
  [Endian.Big]: { msbAt: () => 0, step: 1 },
  [Endian.Little]: { msbAt: (byteCount) => byteCount - 1, step: -1 },
};

/**
 * Assemble `byteCount` bytes at `offset` into one unsigned value, walking out
 * from the most significant byte.
 *
 * BEWARE: The span is assumed to be in bounds — a read past the end of `source`
 * yields NaN rather than throwing.
 *
 * `x * 256` is equivalent to `x << 8`, but the former is more reliable for large values.
 */
export function readWord(
  source: Uint8Array,
  offset: number,
  byteCount: number,
  endian: Endian,
): number {
  const { msbAt, step } = BYTE_ORDER_DESCRIPTORS[endian];
  const msb = msbAt(byteCount);

  let value = 0;

  for (let i = 0; i < byteCount; i++) {
    value = value * 256 + source[offset + msb + i * step];
  }

  return value;
}

const step = 1024;
const gradeNames = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] as const;
type Grade = typeof gradeNames[number];

export const ByteConverter = {
  to: (grade: Grade, bytes: number): number => {
    const index = gradeNames.indexOf(grade);

    if (index === -1) {
      throw new Error(`Invalid grade: ${grade}`);
    }

    return bytes / Math.pow(step, index);
  },
  from: (grade: Grade, value: number): number => {
    const index = gradeNames.indexOf(grade);

    if (index === -1) {
      throw new Error(`Invalid grade: ${grade}`);
    }

    return value * Math.pow(step, index);
  },
};
