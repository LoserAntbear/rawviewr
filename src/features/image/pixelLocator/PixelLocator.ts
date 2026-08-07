import type { Vector2 } from '@definitions/geometry';
import { BITS_PER_BYTE } from '@features/image/format/definitions';
import { Bits, RowOptions } from '@features/image/format/types';
import { clamp } from '@utils/math';
import { DecodeOptions } from '@features/image/imageDecoder/types';
import { Geometry } from '@features/image/imageDecoder/imagePreparation/types';
import { SourceLocation } from '@features/image/sourceReader/types';

export class PixelLocator {
  public readonly bits: Bits;
  public readonly rowOptions: RowOptions; /** --- How the bytes at a location are to be read once found. */

  private readonly width: number;
  private readonly height: number;
  private readonly flipY: boolean;
  private readonly bytesPerRow: number;
  private readonly frameOffset: number;

  constructor(geometry: Geometry, options: DecodeOptions, bits: Bits) {
    const frame = clamp(Math.floor(options.frame), 0, geometry.frameCount - 1);

    this.bits = bits;
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

  public locate(position: Vector2): SourceLocation | null {
    if (!this.contains(position)) {
      return null;
    }

    const rowStart = this.locateRow(position.y);

    if (this.bits >= BITS_PER_BYTE) {
      return {
        bits: this.bits,
        bitOffset: 0,
        byteOffset: rowStart + position.x * (this.bits / BITS_PER_BYTE),
      };
    }

    const pixelsPerByte = BITS_PER_BYTE / this.bits;
    const subPixel = position.x % pixelsPerByte;

    return {
      bits: this.bits,
      byteOffset: rowStart + Math.floor(position.x / pixelsPerByte),
      bitOffset: this.rowOptions.bitOrderMsb
        ? BITS_PER_BYTE - this.bits - subPixel * this.bits
        : subPixel * this.bits,
    };
  }

  private contains({ x, y }: Vector2): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }
}
