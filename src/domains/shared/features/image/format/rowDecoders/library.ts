import { DECOMPRESSOR_BY_KIND } from '../decompressors';
import { PixelFormatPresets } from '../presets';
import type { Decompressor, RowDecoder } from '../types';

import { buildRowDecoder } from './decoders';

export class FormatDecodersLibrary {
  public static readonly ROW_DECODERS: ReadonlyMap<string, RowDecoder> = new Map(
    PixelFormatPresets.DEFINITIONS.map(({ id, spec }) => [id, buildRowDecoder(spec)]),
  );

  public static readonly DECOMPRESSORS: ReadonlyMap<string, Decompressor> = new Map(
    PixelFormatPresets.DEFINITIONS.flatMap(({ id, spec }): [string, Decompressor][] => {
      const decompressor = DECOMPRESSOR_BY_KIND[spec.kind];

      return decompressor ? [[id, decompressor]] : [];
    }),
  );

  public static getRowDecoder(id: string): RowDecoder {
    const decoder = this.ROW_DECODERS.get(id);

    if (!decoder) {
      throw new Error(`No row decoder for pixel format "${id}".`);
    }

    return decoder;
  }

  public static getDecompressor(id: string): Decompressor {
    const decompressor = this.DECOMPRESSORS.get(id);

    if (!decompressor) {
      throw new Error(`No decompressor for pixel format "${id}".`);
    }

    return decompressor;
  }
}
