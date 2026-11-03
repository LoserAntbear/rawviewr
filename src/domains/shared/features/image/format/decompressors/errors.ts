export class ImagFormatError extends Error {
  constructor(detail: string) {
    super(`Not a valid .imag file: ${detail}.`);

    this.name = 'ImagFormatError';
  }
}

export class EmptyImagError extends Error {
  constructor(width: number, height: number) {
    super(`This .imag is an empty ${width}×${height} sprite: there is nothing to draw.`);

    this.name = 'EmptyImagError';
  }
}
