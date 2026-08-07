import { GeometryResolver } from './imagePreparation/GeometryResolver';
import { PixelLocator } from '../pixelLocator/PixelLocator';
import { DecodeOptions, DecodeResult } from './types';
import { type PixelFormat } from '@features/image/format/types';
import { type FormatRegistry } from '@features/image/format/FormatRegistry';
import { shiftRowIndices } from '@utils/array';
import { Geometry } from './imagePreparation/types';

export class ImageDecoder {
  constructor(
    private readonly formatRegistry: FormatRegistry,
    private readonly geometryResolver: GeometryResolver = new GeometryResolver(formatRegistry),
  ) {}

  public decode(source: Uint8Array, options: DecodeOptions): DecodeResult {
    const geometry = this.geometryResolver.resolveGeometry(source, options);
    const format = this.formatRegistry.get(options.format);

    const data = this.applyAlphaMode(
      this.decodeSource(source, geometry, options, format),
      options,
    );

    return {
      source,
      geometry,
      image: { data, width: geometry.width, height: geometry.height },
    };
  }

  private decodeSource(
    source: Uint8Array,
    geometry: Geometry,
    options: DecodeOptions,
    format: PixelFormat,
  ): Uint8ClampedArray<ArrayBuffer> {
    const locator = new PixelLocator(geometry, options, format.bpp);
    const result = new Uint8ClampedArray(geometry.width * geometry.height * 4);

    for (let y = 0; y < geometry.height; y++) {
      const row = format.decodeRow(source, locator.locateRow(y), geometry.width, locator.rowOptions);

      result.set(row, y * geometry.width * 4);
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
        const alpha = result[i + 3];

        if (alpha > 0 && alpha < 255) {
          const scale = 255 / alpha;

          for (const j of shiftRowIndices(i)) {
            result[j] = result[j] * scale;
          }
        }
      }
    }

    return result;
  }
}
