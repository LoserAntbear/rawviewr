import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';
import type { ProbeSample, ProbeState } from './types';
import { isSamePixel } from './utils';

export class ProbeSlice extends StoreSlice<StoreSliceId.Probe, ProbeState> {
  constructor() {
    super(StoreSliceId.Probe, { activeSample: null });
  }

  public get activeSample(): ProbeSample | null {
    return this.getState().activeSample;
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
}
