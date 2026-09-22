import { StoreSliceId } from '../../definitions';
import { StoreSliceEventMap } from '../types';
import type { DecodeOptions } from '@features/image/imageDecoder/types';

export type DecodeOptionsSliceState = DecodeOptions; // Aliasing for clarity and consistency with other slice state types
export type DecodeOptionsSliceEvents = StoreSliceEventMap<StoreSliceId.DecodeOptions, DecodeOptionsSliceState>;
