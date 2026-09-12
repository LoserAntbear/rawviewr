import { ImageDecoder } from '@features/image/imageDecoder/ImageDecoder';
import type { DecodeOptions, DecodedImage } from '@features/image/imageDecoder/types';
import type { FormatRegistry } from '@features/image/format/FormatRegistry';
import { withAbortSignalCheck } from '@utils/abort';

export class WebviewImageDecoder {
  constructor(
    formatRegistry: FormatRegistry,
    private readonly decoder: ImageDecoder = new ImageDecoder(formatRegistry),
  ) {}

  public async decode(
    data: ArrayBuffer,
    options: DecodeOptions,
    signal?: AbortSignal,
  ): Promise<ImageBitmap> {
    signal?.throwIfAborted();

    const { image } = this.decoder.decode(new Uint8Array(data), options);

    // Decoding can take long
    return withAbortSignalCheck(
      signal,
      () => createImageBitmap(this.toImageData(image)),
      (bitmap) => bitmap.close(),
    );
  }

  private toImageData(image: DecodedImage): ImageData {
    return new ImageData(image.data, image.width, image.height);
  }
}
