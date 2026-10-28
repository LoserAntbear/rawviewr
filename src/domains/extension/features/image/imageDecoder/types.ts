import type { Geometry } from '@SHARED/features/image/imageDecoder/imagePreparation/types';

export type OpenedSource = {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly byteLength: number;
  readonly geometry: Geometry;
  readonly detail: string | null;
};
