export abstract class HeaderError extends Error {}

export class HeaderTruncatedError extends HeaderError {
  constructor(
    public readonly requiredBytes: number,
    public readonly availableBytes: number,
  ) {
    super(`Header preset needs ${requiredBytes} bytes, buffer has ${availableBytes}.`);
    this.name = 'HeaderTruncatedError';
  }
}

export class HeaderImplausibleError extends HeaderError {
  constructor(
    public readonly value: number,
    public readonly name: string = 'unknown field',
  ) {
    super(`Header dimension ${value} for ${name} is out of range.`);

    this.name = 'HeaderImplausibleError';
  }
}
