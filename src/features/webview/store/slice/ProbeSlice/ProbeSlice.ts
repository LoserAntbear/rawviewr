import type { SourceBytes, SourceLocation } from '@features/image/sourceReader/types';

import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import type { PinnedProbeSample, ProbeSample, ProbeSlicePayloads, ProbeState } from './types';
import { isSameSample, isSamePixel } from './utils';

/**
 * @activeSample - is the sumple currently hovered by the pointer.
 * @pinnedSample - is the sample currently selected by the user (e.g. via clicking on it)
 */
export class ProbeSlice extends StoreSlice<StoreSliceId.Probe, ProbeState, ProbeSlicePayloads> {
  constructor() {
    super(StoreSliceId.Probe, { activeSample: null, pinnedSample: null });
  }

  public get activeSample(): ProbeSample | null {
    return this.getState().activeSample;
  }

  public get pinnedSample(): PinnedProbeSample | null {
    return this.getState().pinnedSample;
  }

  public setActiveSample(sample: ProbeSample): void {
    if (isSamePixel(this.activeSample, sample)) {
      return;
    }

    this.patch({ activeSample: sample });
  }

  public clearActiveSample(): void {
    this.patch({ activeSample: null });
  }

  public togglePinnedSample(sample: ProbeSample): void {
    this.patch({
      pinnedSample: isSamePixel(this.pinnedSample, sample) ? null : { ...sample, sourceFileBytes: null },
    });
  }

  public resetPinnedSample(): void {
    this.patch({ pinnedSample: null });
  }

  public setSourceBytesForPinnedSample(id: string, location: SourceLocation, bytes: SourceBytes): void {
    const pinnedSample = this.pinnedSample;

    if (!isSameSample(pinnedSample, id, location)) {
      return;
    }

    this.patch({ pinnedSample: { ...pinnedSample as PinnedProbeSample, sourceFileBytes: bytes } });
  }
}
