import type { FormatRegistry } from '@features/image/format/FormatRegistry';
import type { AppStore } from '../store/types';

export interface WebviewContext {
  readonly store: AppStore;
  readonly formatRegistry: FormatRegistry;
}
