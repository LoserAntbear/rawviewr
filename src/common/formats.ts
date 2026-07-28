/**
 * Pixel format registry.
 *
 * Naming convention: channels are listed most-significant-bit first *within the
 * packed word*, which is how hardware datasheets and Khronos/DirectX docs name
 * them. So `rgba4444` reads R from bits 15..12 and A from bits 3..0.
 *
 * The same bytes are called different things by different toolchains, which is
 * exactly why every permutation is available and switching is one click away.
 */

export interface RowOptions {
  /** Byte order used to assemble packed 16/32-bit words. */
  littleEndian: boolean;
  /** For sub-byte formats: does the first pixel of a row sit in the high bits? */
  bitOrderMsb: boolean;
}

export type FormatGroup =
  | '16-bit packed'
  | '32-bit packed'
  | '24-bit'
  | '8-bit packed'
  | 'grayscale'
  | 'sub-byte';

export interface PixelFormat {
  id: string;
  label: string;
  group: FormatGroup;
  /** Bits consumed per pixel. May be < 8 for the sub-byte formats. */
  bpp: number;
  hasAlpha: boolean;
  /** True when the byte order toggle changes the result. */
  endianSensitive: boolean;
  /** True when the bit order toggle changes the result. */
  bitOrderSensitive: boolean;
  /**
   * Decode `count` consecutive pixels starting at `byteOffset` into RGBA8888.
   * Reads past the end of `src` yield transparent black rather than throwing.
   */
  decodeRow(
    src: Uint8Array,
    byteOffset: number,
    dst: Uint8ClampedArray,
    dstIndex: number,
    count: number,
    opts: RowOptions,
  ): void;
}

interface Field {
  /** Shift of the field's least-significant bit within the packed word. */
  shift: number;
  bits: number;
}

interface PackedSpec {
  r: Field;
  g: Field;
  b: Field;
  a?: Field;
}

/** Lookup tables expanding an n-bit channel to 8 bits (0 -> 0, max -> 255). */
const expandTables = new Map<number, Uint8Array>();

function expandTable(bits: number): Uint8Array {
  let table = expandTables.get(bits);
  if (!table) {
    const max = (1 << bits) - 1;
    table = new Uint8Array(max + 1);
    for (let v = 0; v <= max; v++) {
      table[v] = Math.round((v * 255) / max);
    }
    expandTables.set(bits, table);
  }
  return table;
}

function readWord(src: Uint8Array, off: number, bytes: number, littleEndian: boolean): number {
  let v = 0;
  if (littleEndian) {
    for (let i = bytes - 1; i >= 0; i--) {
      v = (v << 8) | src[off + i];
    }
  } else {
    for (let i = 0; i < bytes; i++) {
      v = (v << 8) | src[off + i];
    }
  }
  return v >>> 0;
}

function packed(
  id: string,
  label: string,
  bits: 8 | 16 | 32,
  spec: PackedSpec,
): PixelFormat {
  const bytes = bits / 8;
  const rTab = expandTable(spec.r.bits);
  const gTab = expandTable(spec.g.bits);
  const bTab = expandTable(spec.b.bits);
  const aTab = spec.a ? expandTable(spec.a.bits) : null;
  const rMask = (1 << spec.r.bits) - 1;
  const gMask = (1 << spec.g.bits) - 1;
  const bMask = (1 << spec.b.bits) - 1;
  const aMask = spec.a ? (1 << spec.a.bits) - 1 : 0;

  return {
    id,
    label,
    group:
      bits === 32 ? '32-bit packed' : bits === 16 ? '16-bit packed' : '8-bit packed',
    bpp: bits,
    hasAlpha: !!spec.a,
    endianSensitive: bytes > 1,
    bitOrderSensitive: false,
    decodeRow(src, byteOffset, dst, dstIndex, count, opts) {
      let s = byteOffset;
      let d = dstIndex;
      const limit = src.length - bytes;
      for (let i = 0; i < count; i++, s += bytes, d += 4) {
        if (s < 0 || s > limit) {
          dst[d] = dst[d + 1] = dst[d + 2] = dst[d + 3] = 0;
          continue;
        }
        const word = readWord(src, s, bytes, opts.littleEndian);
        dst[d] = rTab[(word >>> spec.r.shift) & rMask];
        dst[d + 1] = gTab[(word >>> spec.g.shift) & gMask];
        dst[d + 2] = bTab[(word >>> spec.b.shift) & bMask];
        dst[d + 3] = aTab && spec.a ? aTab[(word >>> spec.a.shift) & aMask] : 255;
      }
    },
  };
}

/** Byte-sequence formats: the channel order is the order bytes appear on disk. */
function byteOrdered(id: string, label: string, order: readonly number[]): PixelFormat {
  const bytes = order.length;
  const hasAlpha = order.includes(3);
  return {
    id,
    label,
    group: bytes === 3 ? '24-bit' : '32-bit packed',
    bpp: bytes * 8,
    hasAlpha,
    endianSensitive: false,
    bitOrderSensitive: false,
    decodeRow(src, byteOffset, dst, dstIndex, count) {
      let s = byteOffset;
      let d = dstIndex;
      const limit = src.length - bytes;
      for (let i = 0; i < count; i++, s += bytes, d += 4) {
        if (s < 0 || s > limit) {
          dst[d] = dst[d + 1] = dst[d + 2] = dst[d + 3] = 0;
          continue;
        }
        dst[d + 3] = 255;
        for (let c = 0; c < bytes; c++) {
          const channel = order[c];
          if (channel >= 0) {
            dst[d + channel] = src[s + c];
          }
        }
      }
    },
  };
}

/** 1/2/4-bit grayscale, packed several pixels per byte. */
function subByteGray(id: string, label: string, bits: 1 | 2 | 4): PixelFormat {
  const perByte = 8 / bits;
  const mask = (1 << bits) - 1;
  const tab = expandTable(bits);
  return {
    id,
    label,
    group: 'sub-byte',
    bpp: bits,
    hasAlpha: false,
    endianSensitive: false,
    bitOrderSensitive: true,
    decodeRow(src, byteOffset, dst, dstIndex, count, opts) {
      let d = dstIndex;
      for (let i = 0; i < count; i++, d += 4) {
        const byteIndex = byteOffset + Math.floor(i / perByte);
        if (byteIndex < 0 || byteIndex >= src.length) {
          dst[d] = dst[d + 1] = dst[d + 2] = dst[d + 3] = 0;
          continue;
        }
        const sub = i % perByte;
        const shift = opts.bitOrderMsb ? 8 - bits - sub * bits : sub * bits;
        const v = tab[(src[byteIndex] >>> shift) & mask];
        dst[d] = dst[d + 1] = dst[d + 2] = v;
        dst[d + 3] = 255;
      }
    },
  };
}

function gray8(): PixelFormat {
  return {
    id: 'gray8',
    label: 'GRAY8 — 8-bit luminance',
    group: 'grayscale',
    bpp: 8,
    hasAlpha: false,
    endianSensitive: false,
    bitOrderSensitive: false,
    decodeRow(src, byteOffset, dst, dstIndex, count) {
      let d = dstIndex;
      for (let i = 0; i < count; i++, d += 4) {
        const s = byteOffset + i;
        if (s < 0 || s >= src.length) {
          dst[d] = dst[d + 1] = dst[d + 2] = dst[d + 3] = 0;
          continue;
        }
        dst[d] = dst[d + 1] = dst[d + 2] = src[s];
        dst[d + 3] = 255;
      }
    },
  };
}

function alpha8(): PixelFormat {
  return {
    id: 'alpha8',
    label: 'A8 — 8-bit alpha only',
    group: 'grayscale',
    bpp: 8,
    hasAlpha: true,
    endianSensitive: false,
    bitOrderSensitive: false,
    decodeRow(src, byteOffset, dst, dstIndex, count) {
      let d = dstIndex;
      for (let i = 0; i < count; i++, d += 4) {
        const s = byteOffset + i;
        if (s < 0 || s >= src.length) {
          dst[d] = dst[d + 1] = dst[d + 2] = dst[d + 3] = 0;
          continue;
        }
        dst[d] = dst[d + 1] = dst[d + 2] = 255;
        dst[d + 3] = src[s];
      }
    },
  };
}

function gray16(): PixelFormat {
  return {
    id: 'gray16',
    label: 'GRAY16 — 16-bit luminance (high byte shown)',
    group: 'grayscale',
    bpp: 16,
    hasAlpha: false,
    endianSensitive: true,
    bitOrderSensitive: false,
    decodeRow(src, byteOffset, dst, dstIndex, count, opts) {
      let d = dstIndex;
      const limit = src.length - 2;
      for (let i = 0; i < count; i++, d += 4) {
        const s = byteOffset + i * 2;
        if (s < 0 || s > limit) {
          dst[d] = dst[d + 1] = dst[d + 2] = dst[d + 3] = 0;
          continue;
        }
        const v = readWord(src, s, 2, opts.littleEndian) >>> 8;
        dst[d] = dst[d + 1] = dst[d + 2] = v;
        dst[d + 3] = 255;
      }
    },
  };
}

const FORMAT_LIST: PixelFormat[] = [
  // ---- 16-bit, 4 bits per channel -----------------------------------------
  packed('rgba4444', 'RGBA4444', 16, {
    r: { shift: 12, bits: 4 },
    g: { shift: 8, bits: 4 },
    b: { shift: 4, bits: 4 },
    a: { shift: 0, bits: 4 },
  }),
  packed('argb4444', 'ARGB4444', 16, {
    a: { shift: 12, bits: 4 },
    r: { shift: 8, bits: 4 },
    g: { shift: 4, bits: 4 },
    b: { shift: 0, bits: 4 },
  }),
  packed('abgr4444', 'ABGR4444', 16, {
    a: { shift: 12, bits: 4 },
    b: { shift: 8, bits: 4 },
    g: { shift: 4, bits: 4 },
    r: { shift: 0, bits: 4 },
  }),
  packed('bgra4444', 'BGRA4444', 16, {
    b: { shift: 12, bits: 4 },
    g: { shift: 8, bits: 4 },
    r: { shift: 4, bits: 4 },
    a: { shift: 0, bits: 4 },
  }),
  packed('rgbx4444', 'RGBX4444 — alpha nibble ignored', 16, {
    r: { shift: 12, bits: 4 },
    g: { shift: 8, bits: 4 },
    b: { shift: 4, bits: 4 },
  }),
  packed('xrgb4444', 'XRGB4444 — alpha nibble ignored', 16, {
    r: { shift: 8, bits: 4 },
    g: { shift: 4, bits: 4 },
    b: { shift: 0, bits: 4 },
  }),

  // ---- 16-bit, 5/6/5 and 5/5/5/1 ------------------------------------------
  packed('rgb565', 'RGB565', 16, {
    r: { shift: 11, bits: 5 },
    g: { shift: 5, bits: 6 },
    b: { shift: 0, bits: 5 },
  }),
  packed('bgr565', 'BGR565', 16, {
    b: { shift: 11, bits: 5 },
    g: { shift: 5, bits: 6 },
    r: { shift: 0, bits: 5 },
  }),
  packed('rgba5551', 'RGBA5551', 16, {
    r: { shift: 11, bits: 5 },
    g: { shift: 6, bits: 5 },
    b: { shift: 1, bits: 5 },
    a: { shift: 0, bits: 1 },
  }),
  packed('bgra5551', 'BGRA5551', 16, {
    b: { shift: 11, bits: 5 },
    g: { shift: 6, bits: 5 },
    r: { shift: 1, bits: 5 },
    a: { shift: 0, bits: 1 },
  }),
  packed('argb1555', 'ARGB1555', 16, {
    a: { shift: 15, bits: 1 },
    r: { shift: 10, bits: 5 },
    g: { shift: 5, bits: 5 },
    b: { shift: 0, bits: 5 },
  }),
  packed('abgr1555', 'ABGR1555', 16, {
    a: { shift: 15, bits: 1 },
    b: { shift: 10, bits: 5 },
    g: { shift: 5, bits: 5 },
    r: { shift: 0, bits: 5 },
  }),
  packed('xrgb1555', 'XRGB1555 — top bit ignored', 16, {
    r: { shift: 10, bits: 5 },
    g: { shift: 5, bits: 5 },
    b: { shift: 0, bits: 5 },
  }),

  // ---- 8-bit packed colour -------------------------------------------------
  packed('rgb332', 'RGB332', 8, {
    r: { shift: 5, bits: 3 },
    g: { shift: 2, bits: 3 },
    b: { shift: 0, bits: 2 },
  }),
  packed('bgr233', 'BGR233', 8, {
    b: { shift: 6, bits: 2 },
    g: { shift: 3, bits: 3 },
    r: { shift: 0, bits: 3 },
  }),

  // ---- 24-bit --------------------------------------------------------------
  byteOrdered('rgb888', 'RGB888 — bytes R,G,B', [0, 1, 2]),
  byteOrdered('bgr888', 'BGR888 — bytes B,G,R', [2, 1, 0]),

  // ---- 32-bit (byte-sequence naming, the common convention for 8-bit/ch) ----
  byteOrdered('rgba8888', 'RGBA8888 — bytes R,G,B,A', [0, 1, 2, 3]),
  byteOrdered('argb8888', 'ARGB8888 — bytes A,R,G,B', [3, 0, 1, 2]),
  byteOrdered('abgr8888', 'ABGR8888 — bytes A,B,G,R', [3, 2, 1, 0]),
  byteOrdered('bgra8888', 'BGRA8888 — bytes B,G,R,A', [2, 1, 0, 3]),
  byteOrdered('rgbx8888', 'RGBX8888 — bytes R,G,B,pad', [0, 1, 2, -1]),
  byteOrdered('xrgb8888', 'XRGB8888 — bytes pad,R,G,B', [-1, 0, 1, 2]),
  byteOrdered('bgrx8888', 'BGRX8888 — bytes B,G,R,pad', [2, 1, 0, -1]),
  byteOrdered('xbgr8888', 'XBGR8888 — bytes pad,B,G,R', [-1, 2, 1, 0]),

  // ---- grayscale -----------------------------------------------------------
  gray8(),
  alpha8(),
  gray16(),
  subByteGray('gray4', 'GRAY4 — 4-bit, 2 px/byte', 4),
  subByteGray('gray2', 'GRAY2 — 2-bit, 4 px/byte', 2),
  subByteGray('gray1', 'GRAY1 — 1-bit mono, 8 px/byte', 1),
];

export const FORMATS: ReadonlyMap<string, PixelFormat> = new Map(
  FORMAT_LIST.map((f) => [f.id, f]),
);

export const FORMAT_IDS: readonly string[] = FORMAT_LIST.map((f) => f.id);

export const DEFAULT_FORMAT_ID = 'rgba4444';

export function getFormat(id: string): PixelFormat {
  return FORMATS.get(id) ?? FORMATS.get(DEFAULT_FORMAT_ID)!;
}

/** Format ids bucketed by group, in registry order — used to build <optgroup>s. */
export function formatsByGroup(): { group: FormatGroup; formats: PixelFormat[] }[] {
  const groups: { group: FormatGroup; formats: PixelFormat[] }[] = [];
  for (const format of FORMAT_LIST) {
    let bucket = groups.find((g) => g.group === format.group);
    if (!bucket) {
      bucket = { group: format.group, formats: [] };
      groups.push(bucket);
    }
    bucket.formats.push(format);
  }
  return groups;
}
