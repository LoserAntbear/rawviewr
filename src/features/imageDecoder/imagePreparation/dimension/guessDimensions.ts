import type { Candidate, DimensionGuess, DimensionGuessRule, GuessingConfig } from './types';
import { GUESS_CONFIG, IMAGE_GUESS_RULES_BY_SHAPE, DIMENSION_GUESS_RULES } from './definitions';

/** Peaks at square-ish, falls away for extreme letterboxes. */
function aspectScore(width: number, height: number): number {
  return 1 / (1 + Math.abs(Math.log2(width / height)) / 2);
}

function toCandidate(width: number, totalPixels: number): Candidate {
  return {
    width,
    height: Math.floor(totalPixels / width),
    exactSizeMatch: totalPixels % width === 0,
  };
}

function isValidCandidate({ width, height }: Candidate, config: GuessingConfig): boolean {
  return (
    width >= config.minDimension &&
    width <= config.maxWidth &&
    height >= config.minDimension &&
    height <= config.maxHeight
  );
}

function judge(
  candidate: Candidate,
  source: DimensionGuessRule,
  aspectWeight: number,
): DimensionGuess {
  const matched = IMAGE_GUESS_RULES_BY_SHAPE.filter((rule) => rule.ruleResolver(candidate));

  return {
    ...candidate,
    score:
      aspectScore(candidate.width, candidate.height) * aspectWeight +
      source.points +
      matched.reduce((total, rule) => total + rule.points, 0),
    reasons: [source.reason, ...matched.map((rule) => rule.reason)],
  };
}

/**
 * Proposes plausible width/height pairs based on BBP and source, best first.
 */
export function guessDimensions(
  availableBytes: number,
  bitsPerPixel: number,
  guessingConfig: GuessingConfig = GUESS_CONFIG,
): DimensionGuess[] {
  const totalPixels = Math.floor((availableBytes * 8) / bitsPerPixel);

  if (totalPixels < guessingConfig.minPixels) {
    return [];
  }

  /** One guess per width — the best-scoring source wins. */
  const bestGuesses = new Map<number, DimensionGuess>();

  for (const candidateRule of DIMENSION_GUESS_RULES) {
    for (const width of candidateRule.ruleResolver(totalPixels)) {
      const candidate = toCandidate(width, totalPixels);

      if (!isValidCandidate(candidate, guessingConfig)) {
        continue;
      }

      const guess = judge(candidate, candidateRule, guessingConfig.aspectWeight);
      const sameWidthGuess = bestGuesses.get(width);

      if (!sameWidthGuess || sameWidthGuess.score < guess.score) {
        bestGuesses.set(width, guess);
      }
    }
  }

  return [...bestGuesses.values()].sort((a, b) => b.score - a.score).slice(0, guessingConfig.limit);
}
