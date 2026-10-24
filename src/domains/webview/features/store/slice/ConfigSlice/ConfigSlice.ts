import type { ViewerConfiguration } from '@SHARED/features/settings/configuration/types';
import { DEFAULT_VIEWER_CONFIGURATION } from '@SHARED/features/viewer/definitions';

import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';

import type { ConfigState } from './types';

/**
 * Viewer configuration-based settings state
 */
export class ConfigSlice extends StoreSlice<StoreSliceId.Config, ConfigState> {
  constructor() {
    super(StoreSliceId.Config, { ...DEFAULT_VIEWER_CONFIGURATION, preserveOptionsForAllWindows: false });
  }

  public get tileSize(): number {
    return this.getState().tileSize;
  }

  public get preserveOptionsForAllWindows(): boolean {
    return this.getState().preserveOptionsForAllWindows;
  }

  public setPreserveOptionsForAllWindows(preserveOptionsForAllWindows: boolean): void {
    this.patch({ preserveOptionsForAllWindows });
  }

  public setConfiguration(config: ViewerConfiguration): void {
    this.patch(config);
  }
}
