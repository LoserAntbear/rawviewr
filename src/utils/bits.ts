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

export type ByteGrade = typeof BYTE_GRADES[number];
export const BYTE_STEP = 1024;
export const BYTE_GRADES = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'] as const;

function gradeIndex(grade: ByteGrade): number {
  const index = BYTE_GRADES.indexOf(grade);

  if (index === -1) {
    throw new Error(`Unknown byte grade "${grade}". Expected one of: ${BYTE_GRADES.join(', ')}.`);
  }

  return index;
}

function assertConvertible(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number, received ${value}.`);
  }
}

export const ByteConverter = {
  to: (grade: ByteGrade, bytes: number): number => {
    assertConvertible(bytes, 'bytes');

    return bytes / BYTE_STEP ** gradeIndex(grade);
  },

  from: (grade: ByteGrade, value: number): number => {
    assertConvertible(value, 'value');

    return value * BYTE_STEP ** gradeIndex(grade);
  },

  gradeFor: (bytes: number): ByteGrade => {
    assertConvertible(bytes, 'bytes');

    const magnitude = Math.abs(bytes);

    let index = 0;

    while (index < BYTE_GRADES.length - 1 && magnitude >= BYTE_STEP ** (index + 1)) {
      index++;
    }

    return BYTE_GRADES[index];
  },
};
