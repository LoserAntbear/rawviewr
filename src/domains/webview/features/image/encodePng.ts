import type { SegmentedImage } from '@SHARED/features/image/imageDecoder';

export async function encodeImageToPng(image: SegmentedImage): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('encodePng: could not get a 2d context');
  }

  for (const { row, totalRows, data } of image.segments) {
    context.putImageData(new ImageData(data, image.width, totalRows), 0, row);
  }

  try {
    const blob = await canvas.convertToBlob({ type: 'image/png' });

    return await blob.arrayBuffer();
  } catch (error) {
    // Catch and rethrow with a more descriptive error message
    throw new Error(`encodePng: failed to convert canvas to PNG blob: ${error}`);
  }
}
