import { getFormat } from './formats.js';

export type HeaderPreset = 'none' | 'u16le' | 'u16be' | 'u32le' | 'u32be';
export type AlphaMode = 'use' | 'ignore';

export interface DecodeOptions {
  format: string;
  /** Pixels per row. 0 asks the caller to fall back to a guess. */
  width: number;
  /** Rows per frame. 0 means "all remaining rows". */
  height: number;
  /** Bytes skipped before the first pixel. */
  offset: number;
  /** Bytes per row including padding. 0 = tightly packed. */
  stride: number;
  littleEndian: boolean;
  bitOrderMsb: boolean;
  flipY: boolean;
  alphaMode: AlphaMode;
  unpremultiply: boolean;
  /** Reads width/height out of the first bytes of the file. */
  headerPreset: HeaderPreset;
  /** Which frame of a multi-frame buffer to decode. */
  frame: number;
}

export const DEFAULT_OPTIONS: DecodeOptions = {
  format: 'rgba4444',
  width: 0,
  height: 0,
  offset: 0,
  stride: 0,
  littleEndian: true,
  bitOrderMsb: true,
  flipY: false,
  alphaMode: 'use',
  unpremultiply: false,
  headerPreset: 'none',
  frame: 0,
};

export interface DecodedImage {
  width: number;
  height: number;
  /** RGBA8888, row-major, top-left origin. */
  data: Uint8ClampedArray;
}

export interface Geometry {
  width: number;
  height: number;
  bytesPerRow: number;
  bytesPerFrame: number;
  frameCount: number;
  /** Offset of frame 0's first pixel within the container-decoded buffer. */
  baseOffset: number;
  /** Pixel bytes after container decoding and the header offset. */
  availableBytes: number;
  /** Set when the container or header preset dictated the geometry. */
  lockedByHeader: boolean;
  note?: string;
}

// ---------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------

export interface ContainerResult {
  data: Uint8Array;
  width?: number;
  height?: number;
  /** Bytes of the container header already consumed — the offset control adds to this. */
  headerBytes: number;
  note?: string;
}

/**
 * Experimental decoder for the `.imag` sprite container that this repository
 * reverse-engineers: 24-byte header, u16 LE width/height, then a run-length
 * stream of 16-bit pixels. Control byte < 0x80 introduces a literal run of
 * (c + 1) pixels; otherwise it is a transparent run of ((c & 0x7F) + 1) pixels.
 * Rows are padded out to `width` and the stream restarts per row.
 */
function decodeImagRle(src: Uint8Array): ContainerResult {
  const HEADER = 24;
  if (src.length < HEADER) {
    return { data: src, headerBytes: 0, note: 'file shorter than the 24-byte header' };
  }
  const width = src[0] | (src[1] << 8);
  const height = src[2] | (src[3] << 8);
  if (width <= 0 || height <= 0 || width > 8192 || height > 8192) {
    return { data: src, headerBytes: 0, note: 'header dimensions look implausible' };
  }

  const out = new Uint8Array(width * height * 2);
  let i = HEADER;
  let outPos = 0;

  for (let row = 0; row < height; row++) {
    let x = 0;
    while (x < width && i < src.length) {
      const control = src[i++];
      if (control < 0x80) {
        const count = control + 1;
        for (let n = 0; n < count && x < width; n++, x++) {
          if (i + 1 < src.length) {
            out[outPos] = src[i];
            out[outPos + 1] = src[i + 1];
            i += 2;
          }
          outPos += 2;
        }
      } else {
        const count = (control & 0x7f) + 1;
        const clamped = Math.min(count, width - x);
        outPos += clamped * 2;
        x += clamped;
      }
    }
    outPos += (width - x) * 2;
  }

  return {
    data: out,
    width,
    height,
    headerBytes: 0,
    note: `RLE expanded to ${width}x${height} (experimental)`,
  };
}

export function applyContainer(src: Uint8Array): ContainerResult {
  return { data: src, headerBytes: 0 }
}

function readHeaderDimensions(
  src: Uint8Array,
  preset: HeaderPreset,
): { width: number; height: number; headerBytes: number } | null {
  if (preset === 'none') {
    return null;
  }
  const wide = preset.startsWith('u32');
  const size = wide ? 4 : 2;
  const little = preset.endsWith('le');
  if (src.length < size * 2) {
    return null;
  }
  const read = (off: number): number => {
    let v = 0;
    if (little) {
      for (let i = size - 1; i >= 0; i--) {
        v = v * 256 + src[off + i];
      }
    } else {
      for (let i = 0; i < size; i++) {
        v = v * 256 + src[off + i];
      }
    }
    return v;
  };
  const width = read(0);
  const height = read(size);
  if (width <= 0 || height <= 0 || width > 65535 || height > 65535) {
    return null;
  }
  return { width, height, headerBytes: size * 2 };
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export function tightBytesPerRow(formatId: string, width: number): number {
  const bpp = getFormat(formatId).bpp;
  return Math.ceil((width * bpp) / 8);
}

/** A buffer with its container already unwrapped, plus the resolved geometry. */
export interface Prepared {
  /** Pixel bytes after any container decoding. */
  data: Uint8Array;
  geometry: Geometry;
}

/**
 * Unwraps the container once and works out the effective geometry, resolving
 * the "0 means auto" cases. Callers that re-decode repeatedly (the viewer does,
 * on every option change) should hold on to the result and reuse it.
 */
export function prepare(source: Uint8Array, options: DecodeOptions): Prepared {
  const container = applyContainer(source);

  return { data: container.data, geometry: resolveGeometry(container, options) };
}

function resolveGeometry(container: ContainerResult, options: DecodeOptions): Geometry {
  const data = container.data;

  const header = readHeaderDimensions(data, options.headerPreset)
  const headerBytes = container.headerBytes + (header?.headerBytes ?? 0);

  const offset = Math.max(0, Math.min(data.length, headerBytes + options.offset));
  const availableBytes = Math.max(0, data.length - offset);

  let width = options.width;
  if (container.width) {
    width = container.width;
  } else if (header) {
    width = header.width;
  }
  if (!width || width < 1) {
    width = suggestDimensions(availableBytes, options.format)[0]?.width ?? 1;
  }
  width = Math.max(1, Math.min(65535, Math.floor(width)));

  const bytesPerRow = Math.max(
    tightBytesPerRow(options.format, width),
    Math.floor(options.stride) || 0,
  );

  let height = options.height;
  if (container.height) {
    height = container.height;
  } else if (header) {
    height = header.height;
  }
  if (!height || height < 1) {
    height = Math.max(1, Math.floor(availableBytes / bytesPerRow));
  }
  height = Math.max(1, Math.min(65535, Math.floor(height)));

  const bytesPerFrame = bytesPerRow * height;
  const frameCount = Math.max(1, Math.floor(availableBytes / Math.max(1, bytesPerFrame)));

  return {
    width,
    height,
    bytesPerRow,
    bytesPerFrame,
    frameCount,
    baseOffset: offset,
    availableBytes,
    lockedByHeader: !!container.width || !!header,
    note: container.note,
  };
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

export function decode(source: Uint8Array, options: DecodeOptions): DecodedImage {
  return decodeFrame(prepare(source, options), options);
}

export function decodeFrame(
  prepared: Prepared,
  options: DecodeOptions,
  frame = options.frame,
): DecodedImage {
  const { data, geometry } = prepared;
  const format = getFormat(options.format);
  const base =
    geometry.baseOffset +
    Math.max(0, Math.min(frame, geometry.frameCount - 1)) * geometry.bytesPerFrame;

  const { width, height, bytesPerRow } = geometry;
  const out = new Uint8ClampedArray(width * height * 4);
  const rowOpts = { littleEndian: options.littleEndian, bitOrderMsb: options.bitOrderMsb };

  for (let y = 0; y < height; y++) {
    const sourceRow = options.flipY ? height - 1 - y : y;
    format.decodeRow(data, base + sourceRow * bytesPerRow, out, y * width * 4, width, rowOpts);
  }

  if (options.alphaMode === 'ignore') {
    for (let i = 3; i < out.length; i += 4) {
      out[i] = 255;
    }
  } else if (options.unpremultiply) {
    for (let i = 0; i < out.length; i += 4) {
      const a = out[i + 3];
      if (a > 0 && a < 255) {
        const scale = 255 / a;
        out[i] = out[i] * scale;
        out[i + 1] = out[i + 1] * scale;
        out[i + 2] = out[i + 2] * scale;
      }
    }
  }

  return { width, height, data: out };
}

// ---------------------------------------------------------------------------
// Byte probing (what the viewer reports under the cursor)
// ---------------------------------------------------------------------------

export interface PixelProbe {
  /** Offset of this pixel within the container-decoded buffer. */
  byteOffset: number;
  /** Bit position within the byte, for sub-byte formats. */
  bitOffset: number;
  bits: number;
  /** Source bytes covering the pixel. */
  bytes: number[];
  /** The packed value assembled with the current byte order, if in range. */
  value: number | null;
}

export function probePixel(
  prepared: Prepared,
  options: DecodeOptions,
  x: number,
  y: number,
  frame = options.frame,
): PixelProbe | null {
  const { data, geometry } = prepared;
  if (x < 0 || y < 0 || x >= geometry.width || y >= geometry.height) {
    return null;
  }
  const bits = getFormat(options.format).bpp;
  const sourceRow = options.flipY ? geometry.height - 1 - y : y;
  const rowStart =
    geometry.baseOffset +
    Math.max(0, Math.min(frame, geometry.frameCount - 1)) * geometry.bytesPerFrame +
    sourceRow * geometry.bytesPerRow;

  if (bits < 8) {
    const perByte = 8 / bits;
    const byteOffset = rowStart + Math.floor(x / perByte);
    const sub = x % perByte;
    const shift = options.bitOrderMsb ? 8 - bits - sub * bits : sub * bits;
    const inRange = byteOffset >= 0 && byteOffset < data.length;
    return {
      byteOffset,
      bitOffset: shift,
      bits,
      bytes: inRange ? [data[byteOffset]] : [],
      value: inRange ? (data[byteOffset] >>> shift) & ((1 << bits) - 1) : null,
    };
  }

  const byteCount = bits / 8;
  const byteOffset = rowStart + x * byteCount;
  if (byteOffset < 0 || byteOffset + byteCount > data.length) {
    return { byteOffset, bitOffset: 0, bits, bytes: [], value: null };
  }
  const bytes: number[] = [];
  for (let i = 0; i < byteCount; i++) {
    bytes.push(data[byteOffset + i]);
  }
  let value = 0;
  const ordered = options.littleEndian ? [...bytes].reverse() : bytes;
  for (const b of ordered) {
    value = value * 256 + b;
  }
  return { byteOffset, bitOffset: 0, bits, bytes, value };
}

// ---------------------------------------------------------------------------
// Dimension guessing
// ---------------------------------------------------------------------------

export interface DimensionGuess {
  width: number;
  height: number;
  /** True when width * height consumes the buffer exactly. */
  exact: boolean;
  score: number;
  reason: string;
}

const COMMON_WIDTHS = [
  8, 16, 24, 28, 32, 40, 48, 64, 72, 80, 96, 100, 112, 128, 144, 160, 176, 192, 200, 208,
  224, 240, 256, 272, 288, 320, 352, 360, 384, 400, 416, 432, 448, 464, 480, 512, 540,
  576, 600, 640, 720, 728, 768, 800, 854, 900, 960, 1024, 1080, 1136, 1152, 1200, 1280,
  1366, 1440, 1600, 1680, 1920, 2048, 2560, 3200, 3840, 4096,
];

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Proposes plausible width/height pairs for a headerless buffer, ranked by how
 * "image shaped" they look: exact divisors first, then sane aspect ratios,
 * with a nudge towards powers of two and common display widths.
 */
export function suggestDimensions(
  availableBytes: number,
  formatId: string,
  limit = 12,
): DimensionGuess[] {
  const bpp = getFormat(formatId).bpp;
  const totalPixels = Math.floor((availableBytes * 8) / bpp);
  if (totalPixels < 4) {
    return [];
  }

  const candidates = new Map<number, DimensionGuess>();
  const consider = (width: number, reason: string, bonus: number) => {
    if (width < 1 || width > 8192 || width > totalPixels) {
      return;
    }
    const exact = totalPixels % width === 0;
    const height = exact ? totalPixels / width : Math.floor(totalPixels / width);
    if (height < 1 || height > 16384) {
      return;
    }
    const aspect = width / height;
    // Peaks at square-ish, falls away for extreme letterboxes.
    const aspectScore = 1 / (1 + Math.abs(Math.log2(aspect)) / 2);
    let score = aspectScore * 100 + bonus;
    if (exact) {
      score += 60;
    }
    if (isPowerOfTwo(width) && isPowerOfTwo(height)) {
      score += 25;
    } else if (isPowerOfTwo(width)) {
      score += 10;
    }
    if (width === height) {
      score += 20;
    }
    if (width % 4 === 0) {
      score += 4;
    }
    const existing = candidates.get(width);
    if (!existing || existing.score < score) {
      candidates.set(width, { width, height, exact, score, reason });
    }
  };

  const root = Math.sqrt(totalPixels);
  if (Number.isInteger(root)) {
    consider(root, 'perfect square', 40);
  }

  for (let width = 1; width * width <= totalPixels; width++) {
    if (totalPixels % width === 0) {
      consider(width, 'exact divisor', 0);
      consider(totalPixels / width, 'exact divisor', 0);
    }
  }

  for (const width of COMMON_WIDTHS) {
    consider(width, 'common display width', 12);
  }

  return [...candidates.values()]
    .filter((c) => c.width >= 2 && c.height >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
