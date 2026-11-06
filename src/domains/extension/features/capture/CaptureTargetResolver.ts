import type { CaptureTarget } from './types';

export abstract class CaptureTargetResolver {
  public abstract readonly targetNotFoundMessage: string;

  public abstract listTargets(timeoutMs: number): Promise<readonly CaptureTarget[]>;
}
