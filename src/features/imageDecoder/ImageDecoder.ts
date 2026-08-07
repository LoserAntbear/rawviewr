import { GeometryResolver } from './imagePreparation/GeometryResolver';
import { DecodedImage, DecodeOptions } from './types';
import { type RowOptions } from '@features/format/types';
import { type FormatRegistry } from '@features/format/FormatRegistry';

export class ImageDecoder {
  constructor(
    private readonly formatRegistry: FormatRegistry,
    private readonly geometryResolver: GeometryResolver = new GeometryResolver(formatRegistry),
  ) {}

  public decode(source: Uint8Array, options: DecodeOptions): DecodedImage {
    const geometry = this.geometryResolver.resolveGeometry(source, options);
    const format = this.formatRegistry.get(options.format);

    const base =
      geometry.baseOffset +
      Math.max(0, Math.min(options.frame, geometry.frameCount - 1)) * geometry.bytesPerFrame;

    const { width, height, bytesPerRow } = geometry;
    const out = new Uint8ClampedArray(width * height * 4);
    const rowOptions: RowOptions = { endian: options.endian, bitOrderMsb: options.bitOrderMsb };

    for (let y = 0; y < height; y++) {
      const sourceRow = options.flipY ? height - 1 - y : y;
      const row = format.decodeRow(
        source,
        base + sourceRow * bytesPerRow,
        width,
        rowOptions,
      );

      out.set(row, y * width * 4);
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
}
