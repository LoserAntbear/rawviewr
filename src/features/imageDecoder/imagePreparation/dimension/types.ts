type Rule<Resolver = (candidate: Candidate) => boolean> = {
  points: number;
  reason: string;
  ruleResolver: Resolver;
}

export type Candidate = {
  width: number;
  height: number;
  exactSizeMatch: boolean; /** --- True when width * height consumes the buffer exactly. */
};

export type ScoringRule = Rule;
export type DimensionGuessRule = Rule<(totalPixels: number) => number[]>;

export interface DimensionGuess extends Candidate {
  score: number;
  reasons: string[]; /** --- Every rule that fired, provenance first. */
}

export type GuessingConfig = {
  limit: number;
  maxWidth: number;
  minPixels: number;
  maxHeight: number;
  minDimension: number;
  aspectWeight: number; /** --- How much the aspect ratio as a parameter affects the result compared to other rules. */
}
