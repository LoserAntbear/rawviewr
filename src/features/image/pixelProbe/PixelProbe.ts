import { Vector2 } from '@definitions/geometry';
import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { PixelLocator } from '@features/image/pixelLocator/PixelLocator';
import { SourceReader } from '@features/image/sourceReader/SourceReader';
import { DecodedImage, DecodeOptions, DecodeResult } from '@features/image/imageDecoder/types';
import { PixelSample, Rgba } from './types';

function readRgba({ data, width }: DecodedImage, { x, y }: Vector2): Rgba {
  const index = (y * width + x) * 4;

  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

export class PixelProbe {
  constructor(
    private readonly formatRegistry: FormatRegistry,
    private readonly sourceReader: SourceReader = new SourceReader(),
  ) {}

  public probe(
    decoded: DecodeResult,
    options: DecodeOptions,
    position: Vector2,
  ): PixelSample | null {
    const { source, geometry, image } = decoded;
    const { bpp } = this.formatRegistry.get(options.format);
    const location = new PixelLocator(geometry, options, bpp).locate(position);

    if (!location) {
      return null;
    }

    return {
      ...location,
      position,
      rgba: readRgba(image, position),
      ...this.sourceReader.read(source, location, options.endian),
    };
  }
}
