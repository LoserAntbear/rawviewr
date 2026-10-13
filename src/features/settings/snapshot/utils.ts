import type { DecodeOptions } from '@features/image/imageDecoder/types';

import { PRESERVED_OPTION_KEYS, type PreservedDecodeOptions } from './types';

export function toPreservedOptions(options: DecodeOptions): PreservedDecodeOptions {
  return Object.fromEntries(
    PRESERVED_OPTION_KEYS.map((key) => [key, options[key]]),
  ) as PreservedDecodeOptions;
}
