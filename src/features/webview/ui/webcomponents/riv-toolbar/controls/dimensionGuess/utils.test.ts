import { describe, expect, it } from 'vitest';

import { MAX_FILE_DIMENSION_PX } from '@features/image/imageDecoder/definitions';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { PixelFormatPresets } from '@features/image/format/presets';
import { ViewerBackground } from '@features/viewer/definitions';

import { toDimensionChoices, toDimensionOptions, toDimensionValue } from './utils';
import type { ToolbarSyncPayload } from '../../state/types';

/**
 * The decoder has always ranked these and then quietly taken the first. The picker is that
 * list, surfaced — so what matters here is that it stays honest about which one is in force.
 */

/** 24 bytes at 16 bits a pixel is 12 pixels, which divides several ways. */
const sync = (width = 0, height = 0, availableBytes = 24): ToolbarSyncPayload => ({
  zoom: 1,
  availableBytes,
  background: ViewerBackground.checker,
  options: { ...DEFAULT_DECODE_OPTIONS, format: PixelFormatPresets.getPreset('rgba4444'), width, height },
});

const valuesOf = (state: ToolbarSyncPayload) => toDimensionChoices(state).map(({ value }) => value);

describe('toDimensionChoices', () => {
  it('offers leaving it to the decoder, first', () => {
    expect(toDimensionChoices(sync())[0]).toEqual({ value: '', label: 'auto' });
  });

  it('offers the candidates the decoder would rank, best first', () => {
    const [, ...guesses] = toDimensionChoices(sync());

    // 4×3 consumes all twelve pixels, which outscores the lopsided divisors.
    expect(guesses[0]).toEqual({ value: '4x3', label: '4 × 3' });
    expect(guesses.length).toBeGreaterThan(1);
  });

  it('keeps a size that was typed, which no candidate would offer', () => {
    const [, typed] = toDimensionChoices(sync(5, 7));

    // A select that cannot show its own value shows the first option, claiming "auto".
    expect(typed).toEqual({ value: '5x7', label: '5 × 7 — yours' });
  });

  it('does not repeat a typed size that is already a candidate', () => {
    expect(valuesOf(sync(4, 3)).filter((value) => value === '4x3')).toHaveLength(1);
  });

  it('offers only the auto choice when there is nothing decoded to measure', () => {
    expect(valuesOf(sync(0, 0, 0))).toEqual(['']);
  });

  it('keeps a half-set size out of the list, since it is not a size yet', () => {
    expect(valuesOf(sync(640, 0))).not.toContain('640x0');
  });
});

describe('toDimensionValue', () => {
  it('shows the size in force when both dimensions are set', () => {
    expect(toDimensionValue(sync(640, 480))).toBe('640x480');
  });

  it.each([
    ['both open', 0, 0],
    ['only a width', 640, 0],
    ['only a height', 0, 480],
  ])('reads as auto with %s, since the decoder still decides', (_label, width, height) => {
    expect(toDimensionValue(sync(width, height))).toBe('');
  });
});

describe('toDimensionOptions', () => {
  it('fills both dimensions from the choice', () => {
    expect(toDimensionOptions('640x480')).toEqual({ width: 640, height: 480 });
  });

  it.each([
    ['auto', ''],
    ['nonsense', 'wide x tall'],
    ['a zero', '0x480'],
    ['a negative', '-4x3'],
    ['a fraction', '4.5x3'],
    ['one dimension', '640'],
    ['more than the decoder would keep', `${MAX_FILE_DIMENSION_PX + 1}x480`],
  ])('hands the decision back to the decoder on %s', (_label, raw) => {
    expect(toDimensionOptions(raw)).toEqual({ width: 0, height: 0 });
  });
});
