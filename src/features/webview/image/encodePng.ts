import type { DecodedImage } from '@features/image/imageDecoder/types';

export async function encodeImageToPng(image: DecodedImage): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('encodePng: could not get a 2d context');
  }

  context.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);

  try {
    const blob = await canvas.convertToBlob({ type: 'image/png' });

    return await blob.arrayBuffer();
  } catch (error) {
    // Catch and rethrow with a more descriptive error message
    throw new Error(`encodePng: failed to convert canvas to PNG blob: ${error}`);
  }
}
