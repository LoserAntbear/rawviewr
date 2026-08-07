import { Endian } from '@definitions/bits';
import { FormatGroup, RowChannel, PAD_CHANNEL } from './definitions';

export interface RowOptions {
  endian: Endian;
  bitOrderMsb: boolean; /** --- For sub-byte formats: does the first pixel of a row sit in the high bits? */
}

export interface PixelFormat {
  id: string;
  bpp: Bits; /** --- Bits per pixel. BEWARE: May be < 8 for the sub-byte formats. */
  label: string;
  group: FormatGroup;
  hasAlpha: boolean;
  endianSensitive: boolean;
  bitOrderSensitive: boolean;
  /**
   * Decode `pixelCount` consecutive pixels starting at `byteOffset` into a fresh
   * RGBA8888 row. Pixels that fall past the end of `source` come back as
   * transparent black rather than throwing.
   *
   * FIXME: Rename into `decodeRowToRgba8888` or similar, to make it clear that the output is always RGBA8888.
   */
  decodeRow(
    source: Uint8Array,
    byteOffset: number,
    pixelCount: number,
    options: RowOptions,
  ): Uint8ClampedArray;
}

/** Formats of one group, in the order the registry was given them. */
export interface FormatGroupEntry {
  group: FormatGroup;
  formats: readonly PixelFormat[];
}

export type SubBits = 1 | 2 | 4;
export type FullBits = 8 | 16 | 24 | 32;

export type Bits = SubBits | FullBits;
/**
 * 24 is absent on purpose
 * 3-byte word has no channel layout worth describing,
 * so those formats go through `byteOrdered`.
 */
export type PackedWordBits = Exclude<FullBits, 24>;

/** Luminance sample widths. Wider than 16 would have no extra bits to show. */
export type GrayBits = Extract<FullBits, 8 | 16>;

export interface Field {
  bits: number;
  shift: number; /** --- Shift of the field's least-significant bit within the packed word. */
}

/** One entry of a byte-sequence layout: a channel to fill, or padding to skip. */
export type ByteOrderEntry = RowChannel | typeof PAD_CHANNEL;

export type PackedChannels = {
  r: Field;
  g: Field;
  b: Field;

  a?: Field;
}

export enum FormatKind {
  Gray = 'gray',
  Alpha = 'alpha',
  Packed = 'packed',
  ByteOrdered = 'byte-ordered',
  SubByteGray = 'sub-byte-gray',
}

export type FormatSpec =
  | { kind: FormatKind.Packed; bits: PackedWordBits; channels: PackedChannels }
  | { kind: FormatKind.ByteOrdered; order: readonly ByteOrderEntry[] }
  | { kind: FormatKind.SubByteGray; bits: SubBits }
  | { kind: FormatKind.Gray; bits: GrayBits }
  | { kind: FormatKind.Alpha };

export type FormatDefinition = {
  id: string;
  spec: FormatSpec;

  label?: string; /** --- Derived from the id when absent. */
};

export type FormatBuilder = (definition: FormatDefinition) => PixelFormat;

export type ChannelReader = {
  mask: number;
  table: Uint8Array; /** --- Expands the field's n bits to 8. */
  wordShift: number; /** --- Shift of the field within the packed word. */
  rowIndexShift: number; /** --- Offset of the channel within the pixel's 4 row slots. */
};
