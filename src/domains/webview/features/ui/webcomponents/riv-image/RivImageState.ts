import { byField, type FieldStrategies } from '@utils/strategy';
import { StringFormat } from '@utils/string/formatters';
import {
  type ImageItem,
  isDecodedImageItem,
  type ReadyImageItem,
  type StreamingImageItem,
} from '@WEBVIEW/features/store/slice/ImagesSlice';

import { RIVImageStateKind } from './definitions';
import type { RIVImageCaption, RIVImageState } from './types';

const EMPTY_IMAGE_CAPTION: RIVImageCaption = { name: '', title: '', meta: '' };
export const INITIAL_IMAGE_STATE: RIVImageState = {
  kind: RIVImageStateKind.Loading,
  caption: EMPTY_IMAGE_CAPTION,
};

function resolveCaption(item: ImageItem): RIVImageCaption {
  if (!isDecodedImageItem(item)) {
    return EMPTY_IMAGE_CAPTION;
  }

  return {
    name: item.name,
    title: item.detail ?? item.name,
    meta: `${item.geometry.width}×${item.geometry.height} · ${StringFormat.bytes(item.byteLength)}`,
  };
}

function resolvePaintState(
  item: ReadyImageItem | StreamingImageItem,
  caption: RIVImageCaption,
): RIVImageState {
  // TODO: Thinking about it, should I consider the case for empty images (e.g. bytelength 0) as well?
  return (item.image.segments.length === 0)
    ? { kind: RIVImageStateKind.Loading, caption }
    : { kind: RIVImageStateKind.Paint, caption, image: item.image, runId: item.runId };
}

const STATE_BY_IMAGE: FieldStrategies<ImageItem, 'kind', [caption: RIVImageCaption], RIVImageState> = {
  empty: (_image, caption) => ({ kind: RIVImageStateKind.Empty, caption }),
  pending: (_image, caption) => ({ kind: RIVImageStateKind.Loading, caption }),
  failed: ({ message }, caption) => ({ kind: RIVImageStateKind.Error, caption, message }),
  ready: (item, caption) => resolvePaintState(item, caption),
  streaming: (item, caption) => resolvePaintState(item, caption),
};

export function resolveImageState(
  image: ImageItem | undefined,
): RIVImageState {
  return (image === undefined)
    ? INITIAL_IMAGE_STATE
    : byField(STATE_BY_IMAGE, 'kind', image, resolveCaption(image));
}
