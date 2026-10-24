export class DecodedSizeExceededError extends Error {
  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly limitPixels: number,
  ) {
    super(
      `${width}×${height} is ${width * height} pixels, past the ${limitPixels} this viewer decodes. `
      + 'The geometry is almost certainly wrong — check the header preset, the width, or the format.',
    );

    this.name = 'DecodedSizeExceededError';
  }
}
