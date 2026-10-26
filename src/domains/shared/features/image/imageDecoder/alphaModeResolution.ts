import { shiftRowIndices } from '@utils/array';
import type { Strategies } from '@utils/strategy';

import { AlphaMode } from './definitions';
import type { DecodeOptions } from './types';

type AlphaModeStrategy = 'keep' | 'ignore' | 'unpremultiply';

export const ALPHA_STRATEGIES: Strategies<AlphaModeStrategy, [Uint8ClampedArray], Uint8ClampedArray<ArrayBuffer>> = {
  keep: (source) => source as Uint8ClampedArray<ArrayBuffer>,
  ignore: (source) => {
    for (let i = 3; i < source.length; i += 4) {
      source[i] = 255;
    }

    return source as Uint8ClampedArray<ArrayBuffer>;
  },
  unpremultiply: (source: Uint8ClampedArray) => {
    for (let i = 0; i < source.length; i += 4) {
      const alpha = source[i + 3];

      if (alpha > 0 && alpha < 255) {
        const scale = 255 / alpha;

        for (const j of shiftRowIndices(i)) {
          source[j] = source[j] * scale;
        }
      }
    }

    return source as Uint8ClampedArray<ArrayBuffer>;
  },
};

export function resolveAlphaStrategy(options: DecodeOptions): AlphaModeStrategy {
  let strategy: AlphaModeStrategy = 'keep';

  if (options.alphaMode === AlphaMode.Ignore) {
    strategy = 'ignore';
  } else if (options.unpremultiply) {
    strategy = 'unpremultiply';
  }

  return strategy;
}
