import type { Geometry, SegmentedImage } from '@SHARED/features/image/imageDecoder';

import type { StoreSliceId } from '../../definitions';
import type { StoreSliceEventPayloads } from '../SliceEvents/types';

type DecodedImageResult = {
  readonly id: string;
  readonly name: string;
  readonly runId: string;
  readonly byteLength: number;
  readonly geometry: Geometry;
  readonly detail: string | null;
  readonly image: SegmentedImage;
};

export type StreamingImageItem = DecodedImageResult & {
  readonly kind: 'streaming';
};

export type ReadyImageItem = DecodedImageResult & {
  readonly kind: 'ready';
};

export type ImageItem = { readonly id: string; } & (
  | { readonly kind: 'empty' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'failed'; readonly message: string }
)
  | StreamingImageItem
  | ReadyImageItem;

export type ImagesState = {
  readonly selectedId: string | null;
  readonly byId: ReadonlyMap<string, ImageItem>;
};

export type ImagesSlicePayloads = StoreSliceEventPayloads<StoreSliceId.Images, ImagesState> & {
  'images:decode:requested': { readonly ids: readonly string[] };
};
