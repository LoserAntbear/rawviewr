import { FormatDecodersLibrary } from '@SHARED/features/image/format/rowDecoders';
import { Strategy } from '@utils/strategy/utils';

import { PixelLocator } from '../pixelLocator/PixelLocator';

import { ALPHA_STRATEGIES, resolveAlphaStrategy } from './alphaModeResolution';
import { DecodedSizeExceededError } from './decodeErrors';
import { DEFAULT_ROWS_PER_SEGMENT, MAX_DECODED_PIXELS } from './definitions';
import { GeometryResolver } from './imagePreparation/GeometryResolver';
import type { Geometry } from './imagePreparation/types';
import type { DecodedSegment, DecodeOptions, DecodeResult } from './types';

// TODO: Extract `GeometryResolver` if the geometry resolution logic needs to be reused independently.
export class ImageDecoder {
  constructor(
    private readonly geometryResolver: GeometryResolver = new GeometryResolver(),
  ) {}

  public resolveGeometry(source: Uint8Array, options: DecodeOptions): Geometry {
    return this.geometryResolver.resolveGeometry(source, options);
  }

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

  public *decodeSequential(
    source: Uint8Array,
    options: DecodeOptions,
    geometry: Geometry = this.resolveGeometry(source, options),
    rowsPerSegment: number = DEFAULT_ROWS_PER_SEGMENT,
  ): Generator<DecodedSegment> {
    this.assertDecodableSize(geometry);

    const rowDecoder = FormatDecodersLibrary.getRowDecoder(options.format.id);
    const locator = new PixelLocator(geometry, options, options.format.bpp);
    const alphaStrategy = resolveAlphaStrategy(options);
    const rowByteLength = geometry.width * 4;
    const segmentBandwidth = Math.max(1, Math.floor(rowsPerSegment));

    for (let row = 0; row < geometry.height; row += segmentBandwidth) {
      const totalRows = Math.min(segmentBandwidth, geometry.height - row);
      const dataArray = new Uint8ClampedArray(rowByteLength * totalRows);

      for (let offset = 0; offset < totalRows; offset++) {
        const sourceRow = rowDecoder(
          source,
          locator.locateRow(row + offset),
          geometry.width,
          locator.rowOptions,
        );

        dataArray.set(sourceRow, offset * rowByteLength);
      }

      yield { row, totalRows, data: Strategy.byKey(ALPHA_STRATEGIES, alphaStrategy, dataArray) };
    }
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
    const rowByteLength = geometry.width * 4;
    const result = new Uint8ClampedArray(rowByteLength * geometry.height);

    for (const segment of this.decodeSequential(source, options, geometry)) {
      result.set(segment.data, segment.row * rowByteLength);
    }

    return result;
  }
}
