import type { Vector2 } from '@definitions/geometry';
import { PixelLocator } from '@features/image/pixelLocator/PixelLocator';
import type { DecodedImage, DecodeOptions } from '@features/image/imageDecoder/types';
import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';

import type { PixelSample, Rgba } from './types';

function readRgba({ data, width }: DecodedImage, { x, y }: Vector2): Rgba {
  const index = (y * width + x) * 4;

  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

export function probePixel(
  image: DecodedImage,
  geometry: Geometry,
  options: DecodeOptions,
  position: Vector2,
): PixelSample {
  const location = new PixelLocator(geometry, options, options.format.bpp).locate(position);

  return { position, location, rgba: readRgba(image, position) };
}
