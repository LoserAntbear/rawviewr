import { ImageDecoder } from '@features/image/imageDecoder/ImageDecoder';
import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import type { DecodeOptions, DecodedImage } from '@features/image/imageDecoder/types';

export class WebviewImageDecoder {
  constructor(
    private readonly decoder: ImageDecoder = new ImageDecoder(
      new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format),
    ),
  ) {}

  public async decode(data: ArrayBuffer, options: DecodeOptions): Promise<ImageBitmap> {
    const { image } = this.decoder.decode(new Uint8Array(data), options);

    return createImageBitmap(this.toImageData(image));
  }

  private toImageData(image: DecodedImage): ImageData {
    return new ImageData(image.data, image.width, image.height);
  }
}
