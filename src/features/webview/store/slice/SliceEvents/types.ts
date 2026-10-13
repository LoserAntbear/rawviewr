import type { StoreSliceEventKey } from '../types';

import type { StoreSliceEvent } from './definitions';

type StoreSliceChange<TState> = {
  prev: TState;
  next: TState;
};

type StoreSliceError = {
  message: string;
};

export type StoreSliceEventPayloads<TName extends string, TState> = Record<
  StoreSliceEventKey<TName, StoreSliceEvent.Change>,
  StoreSliceChange<TState>
> & Record<
  StoreSliceEventKey<TName, StoreSliceEvent.Error>,
  StoreSliceError
>;
