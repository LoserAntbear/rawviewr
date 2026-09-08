import type { AppStore } from '../store/types';

export interface WebviewContext {
  readonly store: AppStore;
}
