import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';
import type { DecodeOptions } from '@features/image/imageDecoder/types';

import type { StoreSliceEventMap } from '../types';
import type { StoreSliceId } from '../../definitions';

export type ReadyImageItem = {
  readonly kind: 'ready';
  readonly name: string;
  readonly geometry: Geometry;
  readonly bitmap: ImageBitmap;
};
export type ImageItem =
  | { readonly kind: 'empty' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'failed'; readonly message: string }
  | ReadyImageItem;

export type ImagesState = {
  readonly selectedId: string | null;
  readonly decodeOptions: DecodeOptions;
  readonly byId: ReadonlyMap<string, ImageItem>;
};
export type ImagesSliceEvents = StoreSliceEventMap<StoreSliceId.Images, ImagesState>;