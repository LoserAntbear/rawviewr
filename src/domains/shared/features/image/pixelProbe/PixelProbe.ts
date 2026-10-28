import type { Vector2 } from '@definitions/geometry';
import { type DecodeOptions, locatePixel, type SegmentedImage } from '@SHARED/features/image/imageDecoder';
import type { Geometry } from '@SHARED/features/image/imageDecoder/imagePreparation/types';
import { PixelLocator } from '@SHARED/features/image/pixelLocator/PixelLocator';

import type { PixelSample, Rgba } from './types';

function readRgba(image: SegmentedImage, position: Vector2): Rgba {
  const locatedPixel = locatePixel(image, position);
  const result = { r: 0, g: 0, b: 0, a: 0 };

  if (locatedPixel) {
    const { data, offset } = locatedPixel;

    result.r = data[offset];
    result.g = data[offset + 1];
    result.b = data[offset + 2];
    result.a = data[offset + 3];
  }

  return result;
}

export function probePixel(
  image: SegmentedImage,
  geometry: Geometry,
  options: DecodeOptions,
  position: Vector2,
): PixelSample {
  const location = new PixelLocator(geometry, options, options.format.bpp).locate(position);

  return { position, location, rgba: readRgba(image, position) };
}
