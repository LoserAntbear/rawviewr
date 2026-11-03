import { Endian } from '@definitions/bits';

import type { PixelFormat } from './types';

export function resolveEndian(format: PixelFormat, endian: Endian): Endian {
  return format.endianSensitive ? endian : Endian.Little;
}
