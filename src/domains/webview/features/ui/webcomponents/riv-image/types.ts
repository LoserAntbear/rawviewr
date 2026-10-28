import type { SegmentedImage } from '@SHARED/features/image/imageDecoder';

import type { RIVImageStateKind } from './definitions';

export type RIVImageCaption = {
  name: string;
  meta: string;
  title: string;
};

export type RIVImageState = { caption: RIVImageCaption } & (
  | { kind: RIVImageStateKind.Empty; }
  | { kind: RIVImageStateKind.Loading; }
  | { kind: RIVImageStateKind.Error; message: string; }
  | { kind: RIVImageStateKind.Paint; image: SegmentedImage; runId: string; }
);

/** Painting is asynchronous — the bitmap has to be built — so a renderer may return one. */
export type RIVImageRenderer<K extends RIVImageStateKind = RIVImageStateKind> = (
  state: Extract<RIVImageState, { kind: K }>,
) => void | Promise<void>;

export type RIVImageRendererMap = { readonly [K in RIVImageStateKind]: RIVImageRenderer<K> };
