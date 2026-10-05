import type { Vector2 } from '@definitions/geometry';
import { BITS_PER_BYTE } from '@features/image/format/definitions';
import { Bits, RowOptions } from '@features/image/format/types';
import { clamp } from '@utils/math';
import { DecodeOptions } from '@features/image/imageDecoder/types';
import { Geometry } from '@features/image/imageDecoder/imagePreparation/types';
import { SourceLocation } from '@features/image/sourceReader/types';

export class PixelLocator {
  public readonly bpp: Bits;
  public readonly rowOptions: RowOptions; /** --- How the bytes at a location are to be read once found. */

  private readonly width: number;
  private readonly height: number;
  private readonly flipY: boolean;
  private readonly bytesPerRow: number;
  private readonly frameOffset: number;

  constructor(geometry: Geometry, options: DecodeOptions, bpp: Bits) {
    const frame = clamp(Math.floor(options.frame), 0, geometry.frameCount - 1);

    this.bpp = bpp;
    this.rowOptions = { endian: options.endian, bitOrderMsb: options.bitOrderMsb };

    this.flipY = options.flipY;
    this.width = geometry.width;
    this.height = geometry.height;
    this.bytesPerRow = geometry.bytesPerRow;
    this.frameOffset = geometry.baseOffset + frame * geometry.bytesPerFrame;
  }

  public locateRow(y: number): number {
    const sourceRow = this.flipY ? this.height - 1 - y : y;

    return this.frameOffset + sourceRow * this.bytesPerRow;
  }

  public locate(position: Vector2): SourceLocation {
    if (!this.contains(position)) {
      throw new Error('Position out of bounds');
    }

    const rowStart = this.locateRow(position.y);

    if (this.bpp >= BITS_PER_BYTE) {
      return {
        bitOffset: 0,
        bits: this.bpp,
        byteOffset: rowStart + position.x * (this.bpp / BITS_PER_BYTE),
      };
    }

    const pixelsPerByte = BITS_PER_BYTE / this.bpp;
    const subPixel = position.x % pixelsPerByte;

    return {
      bits: this.bpp,
      byteOffset: rowStart + Math.floor(position.x / pixelsPerByte),
      bitOffset: this.rowOptions.bitOrderMsb
        ? BITS_PER_BYTE - this.bpp - subPixel * this.bpp
        : subPixel * this.bpp,
    };
  }

  private contains({ x, y }: Vector2): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }
}
