import { StoreSliceEvent } from './slice/definitions';

export enum StoreSliceId {
  View = 'view',
  Images = 'images',
  Sources = 'sources',
  DecodeOptions = 'decodeOptions',
}

export const StoreEvent = {
  ViewChange: `${StoreSliceId.View}:${StoreSliceEvent.Change}`,
  ImagesChange: `${StoreSliceId.Images}:${StoreSliceEvent.Change}`,
  SourcesChange: `${StoreSliceId.Sources}:${StoreSliceEvent.Change}`,
  DecodeOptionsChange: `${StoreSliceId.DecodeOptions}:${StoreSliceEvent.Change}`,
} as const;
