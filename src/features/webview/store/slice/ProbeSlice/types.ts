import type { PixelSample } from '@features/image/pixelProbe/types';

export type ProbeSample = PixelSample & { readonly id: string };
export type ProbeState = {
  readonly activeSample: ProbeSample | null;
};
