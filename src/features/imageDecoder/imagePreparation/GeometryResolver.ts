import { HeaderPreset, MAX_DIMENSION } from '../definitions';
import { DecodeOptions } from '../types';
import { DimensionSource, Geometry, Dimension } from './types';
import type { FormatRegistry } from '@features/format/FormatRegistry';
import { resolveHeaderDimensions } from './header/headerResolution';
import { guessDimensions } from './dimension/guessDimensions';
import { clamp } from '@utils/math';

/**
 * Bytes a single row of pixels occupies with no padding
 * the smallest byterow the image can possibly have.
 */
function getMinBytesPerRow(bpp: number, width: number): number {
  return Math.ceil((width * bpp) / 8);
}

/**
 * A dimension is either given — by a header or by the user — or derived from
 * whatever is left in the buffer.
 */
function resolveDimension(
  given: number,
  deriveDimension: () => number,
  max: number = MAX_DIMENSION,
): number {
  const value = given >= 1 ? given : deriveDimension();

  return clamp(Math.floor(value), 1, max);
}

export class GeometryResolver {
  constructor(
    private readonly formatRegistry: FormatRegistry,
  ) {}

  // TODO: Add exception handling for invalid header presets, formats, etc.
  public resolveGeometry(data: Uint8Array, options: DecodeOptions): Geometry {
    const source = this.resolveDimensionSource(data, options);
    const formatDescriptor = this.formatRegistry.get(options.format);

    const offset = clamp(source.headerBytes + options.offset, 0, data.length);
    const availableBytes = Math.max(0, data.length - offset);

    const width = resolveDimension(
      source.width,
      () => this.resolveBestGuessDimensions(availableBytes, formatDescriptor.bpp).width,
    );

    const bytesPerRow = Math.max(
      getMinBytesPerRow(formatDescriptor.bpp, width),
      Math.floor(options.bytesPerRow) || 0,
    );

    const height = resolveDimension(source.height, () => availableBytes / bytesPerRow);

    const bytesPerFrame = bytesPerRow * height;
    const frameCount = Math.max(1, Math.floor(availableBytes / Math.max(1, bytesPerFrame)));

    return {
      width,
      height,
      frameCount,
      bytesPerRow,
      source: data,
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

  private resolveBestGuessDimensions(availableBytes: number, bpp: number): Dimension {
    const guesses = guessDimensions(availableBytes, bpp);
    const bestGuess = guesses.length === 0 ? { width: 1, height: 1 } : guesses[0];

    return bestGuess;
  }
}
