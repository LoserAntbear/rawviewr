import type { DecodedFileSource } from '@features/image/imageDecoder/types';

export type ReadyImageItem = {
  readonly kind: 'ready';
} & Extract<DecodedFileSource, { status: 'success' }>;
export type ImageItem = { readonly id: string; } & (
  | { readonly kind: 'empty' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'failed'; readonly message: string }
)
  | ReadyImageItem;

export type ImagesState = {
  readonly selectedId: string | null;
  readonly byId: ReadonlyMap<string, ImageItem>;
};
