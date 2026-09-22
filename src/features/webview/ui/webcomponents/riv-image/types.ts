
import { ImageItem } from '@features/webview/store/slice/ImagesSlice';
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
  | { kind: RIVImageStateKind.Paint; bitmap: ImageBitmap; }
);

export type RIVImageTransitionPayloads = {
  [RIVImageStateTransition.CloseBitmap]: object;
  [RIVImageStateTransition.Failed]: { error: unknown };
  [RIVImageStateTransition.Resolved]: { item: ImageItem; };
};

export type RIVImageRenderer<K extends RIVImageStateKind = RIVImageStateKind> = (
  state: Extract<RIVImageState, { kind: K }>,
) => void;

export type RIVImageRendererMap = { readonly [K in RIVImageStateKind]: RIVImageRenderer<K> };
