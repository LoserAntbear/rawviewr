import type { DecodeOptionsSliceState } from './types';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';

export class DecodeOptionsSlice extends StoreSlice<StoreSliceId.DecodeOptions, DecodeOptionsSliceState> {
  constructor() {
    super(StoreSliceId.DecodeOptions, { ...DEFAULT_DECODE_OPTIONS });
  }

  public get options(): DecodeOptionsSliceState {
    return this.getState();
  }

  public setOptions(patch: Partial<DecodeOptionsSliceState>): void {
    this.patch(patch);
  }
}
