import { StoreSliceEvent } from './slice/definitions';

export enum StoreSliceId {
  View = 'view',
  Decode = 'decode',
  Images = 'images',
  Sources = 'sources',
}

export const StoreEvent = {
  ViewChange: `${StoreSliceId.View}:${StoreSliceEvent.Change}`,
  DecodeChange: `${StoreSliceId.Decode}:${StoreSliceEvent.Change}`,
  ImagesChange: `${StoreSliceId.Images}:${StoreSliceEvent.Change}`,
  SourcesChange: `${StoreSliceId.Sources}:${StoreSliceEvent.Change}`,
} as const;
