import { GeometryResolver } from './imagePreparation/GeometryResolver';
import { DecodedImage, DecodeOptions } from './types';
import { type RowOptions } from '@features/format/types';
import { type FormatRegistry } from '@features/format/FormatRegistry';
import { Geometry } from './imagePreparation/types';

export class ImageDecoder {
  constructor(
    private readonly formatRegistry: FormatRegistry,
    private readonly geometryResolver: GeometryResolver = new GeometryResolver(formatRegistry),
  ) {}

  public decode(source: Uint8Array, options: DecodeOptions): DecodedImage {
    const geometry = this.geometryResolver.resolveGeometry(source, options);;

    const { width, height } = geometry;
    const result = this.applyAlphaMode(
      this.decodeSource(source, geometry, options),
      options,
    );

    return { width, height, data: result };
  }

  private decodeSource(
    source: Uint8Array,
    geometry: Geometry,
    options: DecodeOptions,
  ): Uint8ClampedArray<ArrayBuffer> {
    const format = this.formatRegistry.get(options.format);
    const { width, height, bytesPerRow, bytesPerFrame, baseOffset } = geometry;

    const result = new Uint8ClampedArray(width * height * 4);
    const rowOptions: RowOptions = { endian: options.endian, bitOrderMsb: options.bitOrderMsb };
    const base = baseOffset
      + Math.max(0, Math.min(options.frame, geometry.frameCount - 1))
      * bytesPerFrame;

    for (let y = 0; y < height; y++) {
      const sourceRow = options.flipY ? height - 1 - y : y;

      const row = format.decodeRow(
        source,
        base + sourceRow * bytesPerRow,
        width,
        rowOptions,
      );

      result.set(row, y * width * 4);
    }

    return result;
  }

  private applyAlphaMode(source: Uint8ClampedArray, options: DecodeOptions): Uint8ClampedArray<ArrayBuffer> {
    const result = new Uint8ClampedArray(source);

    if (options.alphaMode === 'ignore') {
      for (let i = 3; i < result.length; i += 4) {
        result[i] = 255;
      }
    } else if (options.unpremultiply) {
      for (let i = 0; i < result.length; i += 4) {
        const a = result[i + 3];

        if (a > 0 && a < 255) {
          const scale = 255 / a;

          result[i] = result[i] * scale;
          result[i + 1] = result[i + 1] * scale;
          result[i + 2] = result[i + 2] * scale;
        }
      }
    }

    return result;
  }
}
