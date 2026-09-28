import { PixelFormatPresets } from '../presets';
import type { RowDecoder } from '../types';
import { buildRowDecoder } from './decoders';

export class FormatDecodersLibrary {
  public static readonly ROW_DECODERS: ReadonlyMap<string, RowDecoder> = new Map(
    PixelFormatPresets.DEFINITIONS.map(({ id, spec }) => [id, buildRowDecoder(spec)]),
  );

  public static getRowDecoder(id: string): RowDecoder {
    const decoder = this.ROW_DECODERS.get(id);

    if (!decoder) {
      throw new Error(`No row decoder for pixel format "${id}".`);
    }

    return decoder;
  }
}
