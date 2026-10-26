import { FormatDecodersLibrary } from '@SHARED/features/image/format/rowDecoders';
import { byKey } from '@utils/strategy/utils';

import { PixelLocator } from '../pixelLocator/PixelLocator';

import { ALPHA_STRATEGIES } from './alphaModeResolution';
import { DecodedSizeExceededError } from './decodeErrors';
import { MAX_DECODED_PIXELS } from './definitions';
import { GeometryResolver } from './imagePreparation/GeometryResolver';
import type { Geometry } from './imagePreparation/types';
import type { DecodeOptions, DecodeResult } from './types';

// TODO: Extract `GeometryResolver` if the geometry resolution logic needs to be reused independently.
export class ImageDecoder {
  constructor(
    private readonly geometryResolver: GeometryResolver = new GeometryResolver(),
  ) {}

  public resolveGeometry(source: Uint8Array, options: DecodeOptions): Geometry {
    return this.geometryResolver.resolveGeometry(source, options);
  }

  /**
   * Takes the geometry when the caller already has it — the webview resolves it once, when
   * the item arrives — and falls back to resolving it for callers that do not.
   */
  public decode(
    source: Uint8Array,
    options: DecodeOptions,
    geometry: Geometry = this.resolveGeometry(source, options),
  ): DecodeResult {
    this.assertDecodableSize(geometry);

    return {
      source,
      geometry,
      image: {
        width: geometry.width,
        height: geometry.height,
        data: this.decodeSource(source, geometry, options),
      },
    };
  }

  // To avoid OS itself from running out of memory and killing the process,
  // we refuse to decode images that exceed the maximum allowed pixel count.
  private assertDecodableSize({ width, height }: Geometry): void {
    if (width * height > MAX_DECODED_PIXELS) {
      throw new DecodedSizeExceededError(width, height, MAX_DECODED_PIXELS);
    }
  }

  private decodeSource(
    source: Uint8Array,
    geometry: Geometry,
    options: DecodeOptions,
  ): Uint8ClampedArray<ArrayBuffer> {
    const decodeRow = FormatDecodersLibrary.getRowDecoder(options.format.id);
    const locator = new PixelLocator(geometry, options, options.format.bpp);
    const bitWidth = geometry.width * 4;
    const result = new Uint8ClampedArray(bitWidth * geometry.height);
    const alphaStrategy = options.alphaMode === 'ignore' ? 'ignore' : 'unpremultiply';

    for (let y = 0; y < geometry.height; y++) {
      // Alpha is applied in place, with mutation
      // To avoid useless allocations, since huge images will eat up all the memory
      const row = byKey(
        ALPHA_STRATEGIES,
        alphaStrategy,
        decodeRow(source, locator.locateRow(y), geometry.width, locator.rowOptions),
      )

      result.set(row, y * bitWidth);
    }

    return result;
  }
}
