import type { BufferItemData, ItemGeometry } from '@features/buffer';
import { attempt } from '@utils/attempt';
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
    return this.getState();
  }

  public setOptions(patch: Partial<DecodeOptions>): void {
    this.patch(patch);
  }

  public resolveGeometry(item: BufferItemData): ItemGeometry {
    return (item.error || item.data.byteLength === 0)
      ? { kind: 'pending' }
      : attempt<ItemGeometry>(
        () => ({ kind: 'resolved', geometry: this.decoder.resolveGeometry(item.data, this.options) }),
        (error) => ({ kind: 'failed', message: error instanceof Error ? error.message : String(error) }),
      );
  }

  public async decode(
    item: BufferItemData | undefined,
    signal?: AbortSignal,
  ): Promise<ImageBitmap | null> {
    return (!item || item.error || item.geometry?.kind !== 'resolved' || !item.data.byteLength)
      ? null
      : this.decoder.decode(item.data, this.getState(), signal, item.geometry.geometry);
  }
}
