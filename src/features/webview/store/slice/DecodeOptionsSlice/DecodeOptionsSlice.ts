import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import type { DecodeOptions } from '@features/image/imageDecoder/types';

import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import type { StoreSliceEventPayloads } from '../SliceEvents/types';

export type DecodeOptionsState = DecodeOptions;

export type DecodeOptionsSlicePayloads =
  StoreSliceEventPayloads<StoreSliceId.DecodeOptions, DecodeOptionsState> & {
    'decodeOptions:snapshot:requested': { readonly options: DecodeOptions };
  };

export class DecodeOptionsSlice extends StoreSlice<
  StoreSliceId.DecodeOptions,
  DecodeOptionsState,
  DecodeOptionsSlicePayloads
> {
  constructor() {
    super(StoreSliceId.DecodeOptions, { ...DEFAULT_DECODE_OPTIONS });
  }

  public get options(): DecodeOptions {
    return this.getState();
  }

  public setOptions(patch: Partial<DecodeOptions>): void {
    this.patch(patch);
  }
}
