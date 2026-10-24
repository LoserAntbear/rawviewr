import { isSameSet } from '@utils/set/set';

import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';

import type { VirtualListState } from './types';

export class VirtualListSlice extends StoreSlice<StoreSliceId.VirtualList, VirtualListState> {
  constructor() {
    super(StoreSliceId.VirtualList, { ids: new Set() });
  }

  public get ids(): ReadonlySet<string> {
    return this.getState().ids;
  }

  public setIds(ids: ReadonlySet<string>): void {
    if (!isSameSet(this.ids, ids)) {
      this.patch({ ids: new Set(ids) });
    }
  }
}
