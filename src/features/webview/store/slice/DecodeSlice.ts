import type { BufferItemData } from '@features/buffer';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';

import type { WebviewImageDecoder } from '../../image/WebviewImageDecoder';
import { StoreSliceId } from '../definitions';
import { StoreSlice } from './StoreSlice';
import type { StoreSliceEventMap } from './types';

export type DecodeSliceEvents = StoreSliceEventMap<StoreSliceId.Decode, DecodeOptions>;

export class DecodeSlice extends StoreSlice<StoreSliceId.Decode, DecodeOptions> {
  constructor(private readonly decoder: WebviewImageDecoder) {
    super(StoreSliceId.Decode, { ...DEFAULT_DECODE_OPTIONS });
  }

  public get options(): DecodeOptions {
    return this.get();
  }

  public setOptions(patch: Partial<DecodeOptions>): void {
    this.patch(patch);
  }

  public async decode(
    item: BufferItemData | undefined,
    signal?: AbortSignal,
  ): Promise<ImageBitmap | null> {
    if (!item || item.error || item.data.byteLength === 0) {
      return null;
    }

    return this.decoder.decode(item.data, this.get(), signal);
  }
}
