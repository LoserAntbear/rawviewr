import type { StoreSliceEventMap } from '../types';
import type { StoreSliceId } from '../../definitions';

export type ImageItem =
  | { readonly kind: 'empty' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ready'; readonly bitmap: ImageBitmap };

export type ImagesState = {
  readonly selectedId: string | null;
  readonly byId: ReadonlyMap<string, ImageItem>;
};
export type ImagesSliceEvents = StoreSliceEventMap<StoreSliceId.Images, ImagesState>;