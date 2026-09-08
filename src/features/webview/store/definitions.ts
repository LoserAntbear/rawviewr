import { StoreSliceEvent } from './slice/definitions';

export enum StoreSliceId {
  View = 'view',
  Items = 'items',
  Decode = 'decode',
}

export const StoreEvent = {
  ViewChange: `${StoreSliceId.View}:${StoreSliceEvent.Change}`,
  ItemsChange: `${StoreSliceId.Items}:${StoreSliceEvent.Change}`,
  DecodeChange: `${StoreSliceId.Decode}:${StoreSliceEvent.Change}`,
} as const;
