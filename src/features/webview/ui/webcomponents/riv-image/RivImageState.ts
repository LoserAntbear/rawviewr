import type { ImageItem } from '@features/webview/store/slice/ImagesSlice';
import { StringFormat } from '@utils/string/formatters';

import { RIVImageStateKind, RIVImageStateTransition } from './definitions';
import type { RIVImageCaption, RIVImageState, RIVImageTransitionPayloads } from './types';
import { isReadyImageItem } from '@features/webview/store/slice/ImagesSlice/utils';

type RIVImageStateHandlers = {
  readonly [K in RIVImageStateTransition]: (
    prev: RIVImageState,
    payload: RIVImageTransitionPayloads[K],
  ) => RIVImageState;
};

const EMPTY_IMAGE_CAPTION: RIVImageCaption = { name: '', title: '', meta: '' };
export const INITIAL_IMAGE_STATE: RIVImageState = {
  kind: RIVImageStateKind.Loading,
  caption: EMPTY_IMAGE_CAPTION,
};

function resolveCaption(item?: ImageItem): RIVImageCaption {
  if(!isReadyImageItem(item)) {
    return EMPTY_IMAGE_CAPTION;
  }

  return {
    name: item.name,
    title: item.detail ?? item.name,
    meta: StringFormat.bytes(item.byteLength),
  };
}

function closeUnusedBitmap(
  prev: RIVImageState,
  newItem: ImageItem | null,
  next: RIVImageState,
): RIVImageState {
  const kept = next.kind === RIVImageStateKind.Paint ? next.bitmap : null;

  if (prev.kind === RIVImageStateKind.Paint && prev.bitmap !== kept) {
    prev.bitmap.close();
  }

  if (newItem && isReadyImageItem(newItem) && newItem.bitmap !== kept) {
    newItem.bitmap.close();
  }

  return next;
}

// FIXME: Introduce resolvers/handlers rather than having a billion of returns
function resolveNextState({ item }: RIVImageTransitionPayloads[RIVImageStateTransition.Resolved]): RIVImageState {
  const caption = resolveCaption(item);

  if (item.kind === 'failed') {
    return {
      caption,
      message: item.message,
      kind: RIVImageStateKind.Error,
    }
  }

  if (item.kind === 'pending') {
    return { kind: RIVImageStateKind.Loading, caption }
  }

  if (!isReadyImageItem(item)) {
    return { kind: RIVImageStateKind.Empty, caption }
  }

  return {
    bitmap: item.bitmap,
    kind: RIVImageStateKind.Paint,
    caption: { ...caption, meta: `${item.bitmap.width}×${item.bitmap.height} · ${caption.meta}` },
  }
}

export const RIV_IMAGE_STATE_HANDLERS: RIVImageStateHandlers = {
  [RIVImageStateTransition.Resolved]: (prev, payload) => {
    const nextState = resolveNextState(payload);

    return closeUnusedBitmap(prev, payload.item, nextState);
  },

  [RIVImageStateTransition.Failed]: (prev, { error }) => closeUnusedBitmap(prev, null, {
    kind: RIVImageStateKind.Error,
    caption: prev.caption.name ? prev.caption : resolveCaption(),
    message: error instanceof Error ? error.message : String(error),
  }),

  [RIVImageStateTransition.CloseBitmap]: (prev) => {
    if (prev?.kind === RIVImageStateKind.Paint) {
      prev.bitmap.close();
    }

    return prev;
  },
};
