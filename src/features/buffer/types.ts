import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';

export type ItemGeometry =
  | { readonly kind: 'pending' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'resolved'; readonly geometry: Geometry };

export type BufferItemData = {
  readonly id: string;
  readonly name: string;
  readonly data: ArrayBuffer;

  readonly error?: string;
  readonly detail?: string;
  readonly geometry?: ItemGeometry;
};

export type BufferBuildPayload = {
  id: string;
  name: string;
  data: ArrayBuffer;

  detail?: string;
  // If you ever need, for example, to support ancient versions of VSCode.
  base64?: string;
};
