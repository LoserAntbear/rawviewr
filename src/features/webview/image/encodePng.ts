export async function encodeBitmapToPng(bitmap: ImageBitmap): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('encodePng: could not get a 2d context');
  }

  context.drawImage(bitmap, 0, 0);

  try {
    const blob = await canvas.convertToBlob({ type: 'image/png' });

    return blob.arrayBuffer();
  } catch (error) {
    // Catch and rethrow with a more descriptive error message
    throw new Error(`encodePng: failed to convert canvas to PNG blob: ${error}`);
  }
}
