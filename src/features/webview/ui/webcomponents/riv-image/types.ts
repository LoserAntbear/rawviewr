import type { BufferItemData } from '@features/buffer';

import type { RIVImageStateKind, RIVImageStateTransition } from './definitions';

export type RIVImageCaption = {
  name: string;
  meta: string;
  title: string;
};

export type RIVImageState = { caption: RIVImageCaption } & (
  | { kind: RIVImageStateKind.Empty; }
  | { kind: RIVImageStateKind.Loading; }
  | { kind: RIVImageStateKind.Error; message: string; }
  | { kind: RIVImageStateKind.Painted; bitmap: ImageBitmap; }
);

export type RIVImageTransitionPayloads = {
  [RIVImageStateTransition.CloseBitmap]: object;
  [RIVImageStateTransition.Failed]: { item: BufferItemData; error: unknown };
  [RIVImageStateTransition.Resolved]: { item: BufferItemData; bitmap: ImageBitmap | null };
};

export type RIVImageRenderer<K extends RIVImageStateKind = RIVImageStateKind> = (
  state: Extract<RIVImageState, { kind: K }>,
) => void;

export type RIVImageRendererMap = { readonly [K in RIVImageStateKind]: RIVImageRenderer<K> };
