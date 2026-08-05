import { isPowerOfTwo } from '@utils/math';
import { GuessingConfig, ScoringRule, DimensionGuessRule } from './types';
import { perfectSquareWidths, divisorWidths, commonImageWidths } from './dimensionGuessResolvers';

export const GUESS_CONFIG: GuessingConfig = {
  limit: 12,
  minPixels: 4,
  maxWidth: 8192,
  minDimension: 2,
  maxHeight: 16384,
  aspectWeight: 100,
};

export const IMAGE_GUESS_RULES_BY_SHAPE: ScoringRule[] = [
  {
    points: 60,
    reason: 'consumes the buffer exactly',
    ruleResolver: ({ exactSizeMatch }) => exactSizeMatch,
  },
  {
    points: 25,
    reason: 'power-of-two dimensions',
    ruleResolver: ({ width, height }) => isPowerOfTwo(width) && isPowerOfTwo(height),
  },
  {
    points: 20,
    reason: 'square',
    ruleResolver: ({ width, height }) => width === height,
  },
  {
    points: 10,
    reason: 'power-of-two width',
    ruleResolver: ({ width, height }) => isPowerOfTwo(width) && !isPowerOfTwo(height),
  },
  {
    points: 4,
    reason: 'width is a multiple of 4',
    ruleResolver: ({ width }) => width % 4 === 0,
  },
];

export const DIMENSION_GUESS_RULES: DimensionGuessRule[] = [
  { points: 40, reason: 'perfect square', ruleResolver: perfectSquareWidths },
  { points: 12, reason: 'common display width', ruleResolver: commonImageWidths },
  { points: 0, reason: 'exact divisor', ruleResolver: divisorWidths },
];