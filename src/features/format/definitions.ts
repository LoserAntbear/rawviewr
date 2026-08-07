import { buildFormat } from './formatBuilders/builders';
import { FormatDefinition, FormatKind, PackedWordBits, PixelFormat} from './types';

export enum FormatGroup {
  SubByte = 'sub-byte',
  Grayscale = 'grayscale',
  Packed8 = '8-bit packed',
  Packed16 = '16-bit packed',
  Packed24 = '24-bit packed',
  Packed32 = '32-bit packed',
}

export enum RowChannel {
  Red = 0,
  Green = 1,
  Blue = 2,
  Alpha = 3,
}
const { Red, Green, Blue, Alpha } = RowChannel;

/** Byte-sequence entry meaning "this byte is padding, drop it". */
export const PAD_CHANNEL = -1 as const;

/**
 * Naming: channels are listed most-significant-bit first *within the
 * packed word*, which is how hardware datasheets and Khronos/DirectX docs name
 * them. So `rgba4444` reads R from bits 15->12 and A from bits 3->0.
 *
 * Order matters: the registry groups formats as it meets them, so this is also
 * the order the format picker shows.
 */
export const FORMAT_DEFINITIONS: readonly FormatDefinition[] = [
  // ---- 16-bit, 4 bits per channel -----------------------------------------
  {
    id: 'rgba4444',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        r: { shift: 12, bits: 4 },
        g: { shift: 8, bits: 4 },
        b: { shift: 4, bits: 4 },
        a: { shift: 0, bits: 4 },
      },
    },
  },
  {
    id: 'argb4444',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        a: { shift: 12, bits: 4 },
        r: { shift: 8, bits: 4 },
        g: { shift: 4, bits: 4 },
        b: { shift: 0, bits: 4 },
      },
    },
  },
  {
    id: 'abgr4444',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        a: { shift: 12, bits: 4 },
        b: { shift: 8, bits: 4 },
        g: { shift: 4, bits: 4 },
        r: { shift: 0, bits: 4 },
      },
    },
  },
  {
    id: 'bgra4444',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        b: { shift: 12, bits: 4 },
        g: { shift: 8, bits: 4 },
        r: { shift: 4, bits: 4 },
        a: { shift: 0, bits: 4 },
      },
    },
  },
  {
    id: 'rgbx4444',
    label: 'RGBX4444 — alpha nibble ignored',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        r: { shift: 12, bits: 4 },
        g: { shift: 8, bits: 4 },
        b: { shift: 4, bits: 4 },
      },
    },
  },
  {
    id: 'xrgb4444',
    label: 'XRGB4444 — alpha nibble ignored',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        r: { shift: 8, bits: 4 },
        g: { shift: 4, bits: 4 },
        b: { shift: 0, bits: 4 },
      },
    },
  },

  // ---- 16-bit, 5/6/5 and 5/5/5/1 ------------------------------------------
  {
    id: 'rgb565',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        r: { shift: 11, bits: 5 },
        g: { shift: 5, bits: 6 },
        b: { shift: 0, bits: 5 },
      },
    },
  },
  {
    id: 'bgr565',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        b: { shift: 11, bits: 5 },
        g: { shift: 5, bits: 6 },
        r: { shift: 0, bits: 5 },
      },
    },
  },
  {
    id: 'rgba5551',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        r: { shift: 11, bits: 5 },
        g: { shift: 6, bits: 5 },
        b: { shift: 1, bits: 5 },
        a: { shift: 0, bits: 1 },
      },
    },
  },
  {
    id: 'bgra5551',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        b: { shift: 11, bits: 5 },
        g: { shift: 6, bits: 5 },
        r: { shift: 1, bits: 5 },
        a: { shift: 0, bits: 1 },
      },
    },
  },
  {
    id: 'argb1555',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        a: { shift: 15, bits: 1 },
        r: { shift: 10, bits: 5 },
        g: { shift: 5, bits: 5 },
        b: { shift: 0, bits: 5 },
      },
    },
  },
  {
    id: 'abgr1555',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        a: { shift: 15, bits: 1 },
        b: { shift: 10, bits: 5 },
        g: { shift: 5, bits: 5 },
        r: { shift: 0, bits: 5 },
      },
    },
  },
  {
    id: 'xrgb1555',
    label: 'XRGB1555 — top bit ignored',
    spec: {
      kind: FormatKind.Packed,
      bits: 16,
      channels: {
        r: { shift: 10, bits: 5 },
        g: { shift: 5, bits: 5 },
        b: { shift: 0, bits: 5 },
      },
    },
  },

  // ---- 8-bit packed colour -------------------------------------------------
  {
    id: 'rgb332',
    spec: {
      kind: FormatKind.Packed,
      bits: 8,
      channels: {
        r: { shift: 5, bits: 3 },
        g: { shift: 2, bits: 3 },
        b: { shift: 0, bits: 2 },
      },
    },
  },
  {
    id: 'bgr233',
    spec: {
      kind: FormatKind.Packed,
      bits: 8,
      channels: {
        b: { shift: 6, bits: 2 },
        g: { shift: 3, bits: 3 },
        r: { shift: 0, bits: 3 },
      },
    },
  },

  // ---- 24-bit --------------------------------------------------------------
  { id: 'rgb888', spec: { kind: FormatKind.ByteOrdered, order: [Red, Green, Blue] } },
  { id: 'bgr888', spec: { kind: FormatKind.ByteOrdered, order: [Blue, Green, Red] } },

  // ---- 32-bit (byte-sequence naming, the common convention for 8-bit/ch) ----
  { id: 'rgba8888', spec: { kind: FormatKind.ByteOrdered, order: [Red, Green, Blue, Alpha] } },
  { id: 'argb8888', spec: { kind: FormatKind.ByteOrdered, order: [Alpha, Red, Green, Blue] } },
  { id: 'abgr8888', spec: { kind: FormatKind.ByteOrdered, order: [Alpha, Blue, Green, Red] } },
  { id: 'bgra8888', spec: { kind: FormatKind.ByteOrdered, order: [Blue, Green, Red, Alpha] } },
  { id: 'rgbx8888', spec: { kind: FormatKind.ByteOrdered, order: [Red, Green, Blue, PAD_CHANNEL] } },
  { id: 'xrgb8888', spec: { kind: FormatKind.ByteOrdered, order: [PAD_CHANNEL, Red, Green, Blue] } },
  { id: 'bgrx8888', spec: { kind: FormatKind.ByteOrdered, order: [Blue, Green, Red, PAD_CHANNEL] } },
  { id: 'xbgr8888', spec: { kind: FormatKind.ByteOrdered, order: [PAD_CHANNEL, Blue, Green, Red] } },

  // ---- grayscale -----------------------------------------------------------
  { id: 'gray8', spec: { kind: FormatKind.Gray, bits: 8 } },
  { id: 'alpha8', label: 'A8 — 8-bit alpha only', spec: { kind: FormatKind.Alpha } },
  { id: 'gray16', spec: { kind: FormatKind.Gray, bits: 16 } },
  { id: 'gray4', spec: { kind: FormatKind.SubByteGray, bits: 4 } },
  { id: 'gray2', spec: { kind: FormatKind.SubByteGray, bits: 2 } },
  {
    id: 'gray1',
    label: 'GRAY1 — 1-bit mono, 8 px/byte',
    spec: { kind: FormatKind.SubByteGray, bits: 1 },
  },
];

/** The definitions above, built. This is what the registry stores. */
export const FORMAT_PRESETS: readonly PixelFormat[] = FORMAT_DEFINITIONS.map(buildFormat);

/** Used when a buffer has no remembered format, and when a remembered id is unknown. */
export const DEFAULT_FORMAT_ID = 'rgba4444';

export const OPAQUE_VALUE = 255;
export const BITS_PER_BYTE = 8;

export const CHANNEL_LETTERS: Record<RowChannel, string> = {
  [RowChannel.Red]: 'R',
  [RowChannel.Green]: 'G',
  [RowChannel.Blue]: 'B',
  [RowChannel.Alpha]: 'A',
};

export const PACKED_GROUPS: Record<PackedWordBits, FormatGroup> = {
  8: FormatGroup.Packed8,
  16: FormatGroup.Packed16,
  32: FormatGroup.Packed32,
};