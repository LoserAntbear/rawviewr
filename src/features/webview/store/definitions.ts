import { StoreSliceEvent } from './slice/definitions';

export enum StoreSliceId {
  View = 'view',
  Items = 'items',
  Decode = 'decode',
  Images = 'images',
}

export const StoreEvent = {
  ViewChange: `${StoreSliceId.View}:${StoreSliceEvent.Change}`,
  ItemsChange: `${StoreSliceId.Items}:${StoreSliceEvent.Change}`,
  DecodeChange: `${StoreSliceId.Decode}:${StoreSliceEvent.Change}`,
  ImagesChange: `${StoreSliceId.Images}:${StoreSliceEvent.Change}`,
} as const;
