import type { StoreSliceId } from '../../definitions';
import type { StoreSliceEventPayloads } from '../SliceEvents/types';

import type { ImageItem } from './ImageItem';

export type ImagesState = {
  readonly selectedId: string | null;
  readonly byId: ReadonlyMap<string, ImageItem>;
};

export type ImagesSlicePayloads = StoreSliceEventPayloads<StoreSliceId.Images, ImagesState> & {
  'images:decode:requested': { readonly ids: readonly string[] };
};
