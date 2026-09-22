import { type ImageItem, isReadyImageItem } from '@features/webview/store/slice/ImagesSlice';
import { StringFormat } from '@utils/string/formatters';
import { byKind, type KindStrategies } from '@utils/strategy';

import { RIVImageStateKind } from './definitions';
import type { RIVImageCaption, RIVImageState } from './types';

const EMPTY_IMAGE_CAPTION: RIVImageCaption = { name: '', title: '', meta: '' };
export const INITIAL_IMAGE_STATE: RIVImageState = {
  kind: RIVImageStateKind.Loading,
  caption: EMPTY_IMAGE_CAPTION,
};

/**
 * Geometry lives on the item, so the caption says the same thing whether the decode
 * succeeded or failed — there is no previous state to remember it from.
 */
function resolveCaption(item: ImageItem): RIVImageCaption {
  if (!isReadyImageItem(item)) {
    return EMPTY_IMAGE_CAPTION;
  }

  return {
    name: item.name,
    title: item.detail ?? item.name,
    meta: `${item.bitmap.width}×${item.bitmap.height} · ${StringFormat.bytes(item.byteLength)}`,
  };
}

const STATE_BY_IMAGE: KindStrategies<ImageItem, [caption: RIVImageCaption], RIVImageState> = {
  empty: (_image, caption) => ({ kind: RIVImageStateKind.Empty, caption }),
  pending: (_image, caption) => ({ kind: RIVImageStateKind.Loading, caption }),
  ready: ({ bitmap }, caption) => ({ kind: RIVImageStateKind.Paint, caption, bitmap }),
  failed: ({ message }, caption) => ({ kind: RIVImageStateKind.Error, caption, message }),
};

export function resolveImageState(
  image: ImageItem | undefined,
): RIVImageState {
  return (image === undefined)
    ? INITIAL_IMAGE_STATE
    : byKind(STATE_BY_IMAGE, image, resolveCaption(image));
}
