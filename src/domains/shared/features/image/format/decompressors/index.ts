import type { Decompressor } from '../types';
import { FormatKind } from '../types';

import { IMAG_DECOMPRESSOR } from './imag';

export * from './errors';
export * from './imag';

export const DECOMPRESSOR_BY_KIND: Partial<Record<FormatKind, Decompressor>> = {
  [FormatKind.Imag]: IMAG_DECOMPRESSOR,
};
