import type { PixelSample } from '@features/image/pixelProbe/types';
import type { SourceBytesResult, SourceLocation } from '@features/image/sourceReader/types';

import type { StoreSliceId } from '../../definitions';
import type { StoreSliceEventPayloads } from '../SliceEvents/types';

export type ProbeSample = PixelSample & { readonly id: string };
export type PinnedSourceBytes = { readonly kind: 'pending' } | SourceBytesResult;

export type PinnedProbeSample = ProbeSample & { readonly sourceFileBytes: PinnedSourceBytes };

export type ProbeState = {
  readonly activeSample: ProbeSample | null;
  readonly pinnedSample: PinnedProbeSample | null;
};

export type ProbeSlicePayloads = StoreSliceEventPayloads<StoreSliceId.Probe, ProbeState> & {
  'probe:receive:source-bytes:requested': { readonly id: string; readonly location: SourceLocation };
};
