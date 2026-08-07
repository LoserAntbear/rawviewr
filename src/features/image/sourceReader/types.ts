import type { Bits } from '@features/image/format/types';

export type SourceLocation = {
  bits: Bits;
  bitOffset: number; /** --- Shift within the byte. Always 0 for byte-aligned formats. */
  byteOffset: number;
};

export type SourceBytes = {
  bytes: number[];
  value: number | null; /** --- The bytes assembled into one value, respects byte order. */
};
