import { guessDimensions } from '@features/image/imageDecoder/imagePreparation/dimension/guessDimensions';
import type { Dimension } from '@features/image/imageDecoder/imagePreparation/types';
import type { DecodeOptions } from '@features/image/imageDecoder/types';

import type { ToolbarChoice } from '../types';
import type { ToolbarSyncPayload } from '../../state/types';

import { AUTO_DIMENSIONS, AUTO_DIMENSION_VALUE, DIMENSION_SEPARATOR } from './definitions';
import { DIMENSION_LABELS } from './labels';
import { areValidDimensions } from './validation';

function encodeDimensions({ width, height }: Dimension): string {
  return `${width}${DIMENSION_SEPARATOR}${height}`;
}

function parseDimensions(raw: string): Dimension | null {
  // A raw value missing its separator leaves a part absent; NaN is what that is, and
  // `areValidDimensions` turns it down the same way it turns down a zero.
  const [width = NaN, height = NaN] = raw.split(DIMENSION_SEPARATOR).map(Number);
  const dimension = { width, height };

  return areValidDimensions(dimension) ? dimension : null;
}

function toChoice(dimension: Dimension): ToolbarChoice {
  return { value: encodeDimensions(dimension), label: DIMENSION_LABELS.guess(dimension) };
}

function toCustomChoice(dimension: Dimension): ToolbarChoice {
  return { value: encodeDimensions(dimension), label: DIMENSION_LABELS.custom(dimension) };
}

export function toDimensionChoices(state: ToolbarSyncPayload): readonly ToolbarChoice[] {
  const guesses = guessDimensions(state.availableBytes, state.options.format.bpp).map(toChoice);
  const current = parseDimensions(toDimensionValue(state));
  const listed = current !== null && guesses.some(({ value }) => value === encodeDimensions(current));

  return [
    { value: AUTO_DIMENSION_VALUE, label: DIMENSION_LABELS.auto() },
    ...(current === null || listed ? [] : [toCustomChoice(current)]),
    ...guesses,
  ];
}

export function toDimensionValue({ options }: ToolbarSyncPayload): string {
  return areValidDimensions(options) ? encodeDimensions(options) : AUTO_DIMENSION_VALUE;
}

export function toDimensionOptions(raw: string): Partial<DecodeOptions> {
  return parseDimensions(raw) ?? AUTO_DIMENSIONS;
}
