import type { CaptureTargetResolver } from './CaptureTargetResolver';
import type { CaptureTool } from './CaptureTool';

export interface CaptureTools {
  currentPlatformTargetResolver: CaptureTargetResolver | null;

  getActiveTool(): CaptureTool | null;
};

export type CaptureTarget = {
  readonly pid: number;
  readonly name: string;
};

export type CaptureRequest = {
  readonly timeoutMs: number;

  readonly target?: CaptureTarget;
  // If the tool writes to a file, this is the path it should write to.
  // Absent if the tool returns bytes.
  readonly outputPath?: string;
};

export type CaptureOutputData =
  | { readonly kind: 'container'; readonly path: string }
  | { readonly kind: 'bytes'; readonly bytes: Uint8Array };

export type CaptureLog = readonly string[];
export type CaptureOutcome =
  | { readonly kind: 'missingTarget' }
  | { readonly kind: 'failed'; readonly reason: string; readonly log: CaptureLog }
  | { readonly kind: 'captured'; readonly data: CaptureOutputData; readonly log: CaptureLog };

