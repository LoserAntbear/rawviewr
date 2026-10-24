import { DEFAULT_DECODE_OPTIONS } from '@SHARED/features/image/imageDecoder/definitions';
import type { DecodeOptions } from '@SHARED/features/image/imageDecoder/types';

import { StoreSliceId } from '../../definitions';
import type { StoreSliceEventPayloads } from '../SliceEvents/types';
import { StoreSlice } from '../StoreSlice';

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
