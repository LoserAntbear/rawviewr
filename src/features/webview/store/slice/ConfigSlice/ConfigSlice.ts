import type { ViewerConfiguration } from '@features/settings/VSCodeWorkspaceConfig/types';
import { DEFAULT_VIEWER_CONFIGURATION } from '@features/viewer/definitions';

import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import type { ConfigState } from './types';

/**
 * Viewer configuration-based settings state
 */
export class ConfigSlice extends StoreSlice<StoreSliceId.Config, ConfigState> {
  constructor() {
    super(StoreSliceId.Config, DEFAULT_VIEWER_CONFIGURATION);
  }

  public get tileSize(): number {
    return this.getState().tileSize;
  }

  public setConfiguration(config: ViewerConfiguration): void {
    this.patch(config);
  }
}
