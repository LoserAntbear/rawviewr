import type { BufferItemData } from '@features/buffer';
import { StringFormat } from '@utils/string/formatters';

import { RIVImageStateKind, RIVImageStateTransition } from './definitions';
import type { RIVImageCaption, RIVImageState, RIVImageTransitionPayloads } from './types';

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

function resolveCaption(item: BufferItemData): RIVImageCaption {
  return {
    name: item.name,
    title: item.detail ?? item.name,
    meta: StringFormat.bytes(item.data.byteLength),
  };
}

function closeUnusedBitmap(
  prev: RIVImageState,
  incoming: ImageBitmap | null,
  next: RIVImageState,
): RIVImageState {
  const kept = next.kind === RIVImageStateKind.Painted ? next.bitmap : null;

  if (prev.kind === RIVImageStateKind.Painted && prev.bitmap !== kept) {
    prev.bitmap.close();
  }

  if (incoming && incoming !== kept) {
    incoming.close();
  }

  return next;
}

// FIXME: Introduce resolvers/handlers rather than having a billion of returns
function resolveNextState({ item, bitmap }: RIVImageTransitionPayloads[RIVImageStateTransition.Resolved]): RIVImageState {
  const caption = resolveCaption(item);

  if (item.error) {
    return {
      kind: RIVImageStateKind.Error,
      caption,
      message: item.error,
    }
  }

  // A stub: the host has announced the file but its bytes are still in flight.
  if (item.data.byteLength === 0) {
    return { kind: RIVImageStateKind.Loading, caption }
  }

  if (!bitmap) {
    return { kind: RIVImageStateKind.Empty, caption }
  }

  return {
    bitmap,
    kind: RIVImageStateKind.Painted,
    caption: { ...caption, meta: `${bitmap.width}×${bitmap.height} · ${caption.meta}` },
  }
}

export const RIV_IMAGE_STATE_HANDLERS: RIVImageStateHandlers = {
  [RIVImageStateTransition.Resolved]: (prev, payload) => {
    const nextState = resolveNextState(payload);

    return closeUnusedBitmap(prev, payload.bitmap, nextState);
  },

  [RIVImageStateTransition.Failed]: (prev, { item, error }) => closeUnusedBitmap(prev, null, {
    kind: RIVImageStateKind.Error,
    caption: prev.caption.name ? prev.caption : resolveCaption(item),
    message: error instanceof Error ? error.message : String(error),
  }),

  [RIVImageStateTransition.CloseBitmap]: (prev) => {
    if (prev?.kind === RIVImageStateKind.Painted) {
      prev.bitmap.close();
    }

    return prev;
  },
};
