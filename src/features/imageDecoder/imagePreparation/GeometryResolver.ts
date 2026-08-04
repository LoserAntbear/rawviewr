import { HeaderPreset, MAX_DIMENSION } from '../definitions';
import { DecodeOptions } from '../types';
import { DimensionSource, Geometry } from './types';
import { resolveHeaderDimensions } from './header/headerResolution';
import { clamp } from '@utils/math';

const COMMON_WIDTHS = [
  8, 16, 24, 28, 32, 40, 48, 64, 72, 80, 96, 100, 112, 128, 144, 160, 176, 192, 200, 208,
  224, 240, 256, 272, 288, 320, 352, 360, 384, 400, 416, 432, 448, 464, 480, 512, 540,
  576, 600, 640, 720, 728, 768, 800, 854, 900, 960, 1024, 1080, 1136, 1152, 1200, 1280,
  1366, 1440, 1600, 1680, 1920, 2048, 2560, 3200, 3840, 4096,
];

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function tightBytesPerRow(formatId: string, width: number): number {
  const bpp = getFormat(formatId).bpp;

  return Math.ceil((width * bpp) / 8);
}

/**
 * A dimension is either given — by a header or by the user — or derived from
 * whatever is left in the buffer.
 */
function resolveDimension(given: number, derive: () => number): number {
  const value = given >= 1 ? given : derive();

  return clamp(Math.floor(value), 1, MAX_DIMENSION);
}

export class GeometryResolver {
  // TODO: Add exception handling for invalid header presets, formats, etc.
  public resolveGeometry(data: Uint8Array, options: DecodeOptions): Geometry {
    const source = this.resolveDimensionSource(data, options);

    const offset = clamp(source.headerBytes + options.offset, 0, data.length);
    const availableBytes = Math.max(0, data.length - offset);

    const width = resolveDimension(source.width, () =>
      this.suggestDimensions(availableBytes, options.format)[0]?.width ?? 1,
    );

    const bytesPerRow = Math.max(
      tightBytesPerRow(options.format, width),
      Math.floor(options.stride) || 0,
    );

    const height = resolveDimension(source.height, () => availableBytes / bytesPerRow);

    const bytesPerFrame = bytesPerRow * height;
    const frameCount = Math.max(1, Math.floor(availableBytes / Math.max(1, bytesPerFrame)));

    return {
      width,
      height,
      frameCount,
      bytesPerRow,
      bytesPerFrame,
      availableBytes,
      baseOffset: offset,
      lockedByHeader: source.lockedByHeader,
    };
  }

  private resolveDimensionSource(data: Uint8Array, options: DecodeOptions): DimensionSource {
    if (options.headerPreset === HeaderPreset.None) {
      return {
        headerBytes: 0,
        width: options.width,
        lockedByHeader: false,
        height: options.height,
      };
    }

    const { width, height, headerBytes } = resolveHeaderDimensions(data, options.headerPreset);

    return { width, height, headerBytes, lockedByHeader: true };
  }

  private suggestDimensions(
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
}
