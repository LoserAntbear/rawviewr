import { describe, expect, it } from 'vitest';

import { DEFAULT_DECODE_OPTIONS } from '../imageDecoder/definitions';
import { ImageDecoder } from '../imageDecoder/ImageDecoder';

import { PixelFormatPresets } from './presets';

/**
 * A format declares `bpp` and its row decoder walks a stride, and nothing makes the two agree.
 * They are read by different things — `bpp` sizes the geometry and places each row, the stride
 * consumes bytes within one — so a mismatch does not throw. It puts row one at the wrong offset
 * and the picture comes out sheared, which is the kind of wrong that survives a unit test of the
 * decoder alone.
 *
 * So this drives the whole decoder: a buffer of exactly the size the format implies, filled with
 * white, has to come back white.
 */
const WHITE_LUMA = 235;
const NEUTRAL_CHROMA = 128;

/** One pixel-group's bytes, in each format's own order. */
const whiteGroup: Record<string, number[]> = {
  yuyv: [WHITE_LUMA, NEUTRAL_CHROMA, WHITE_LUMA, NEUTRAL_CHROMA],
  uyvy: [NEUTRAL_CHROMA, WHITE_LUMA, NEUTRAL_CHROMA, WHITE_LUMA],
  yvyu: [WHITE_LUMA, NEUTRAL_CHROMA, WHITE_LUMA, NEUTRAL_CHROMA],
  vyuy: [NEUTRAL_CHROMA, WHITE_LUMA, NEUTRAL_CHROMA, WHITE_LUMA],
  yuv444: [WHITE_LUMA, NEUTRAL_CHROMA, NEUTRAL_CHROMA],
  vuy444: [NEUTRAL_CHROMA, NEUTRAL_CHROMA, WHITE_LUMA],
};

/** Pixels a group carries: 4:2:2 pairs them, 4:4:4 does not. */
const groupPixels = (id: string) => (id.endsWith('444') ? 1 : 2);

describe('the declared bits per pixel against the decoder stride', () => {
  it.each(Object.keys(whiteGroup))('%s decodes a full frame of white', (id) => {
    const format = PixelFormatPresets.getPreset(id);
    const [width, height] = [4, 3];
    const groupsPerRow = width / groupPixels(id);
    const row = new Array(groupsPerRow).fill(whiteGroup[id]!).flat();
    const source = new Uint8Array(new Array(height).fill(row).flat());

    // The buffer is exactly what `bpp` says the frame costs — if it is not, the format lies.
    expect(source.length).toBe((width * height * format.bpp) / 8);

    const { image, geometry } = new ImageDecoder().decode(source, { ...DEFAULT_DECODE_OPTIONS, format, width, height });

    expect(geometry.bytesPerRow).toBe(row.length);
    // Every pixel, not just the first row: a wrong stride shows up on row two onwards.
    expect([...image.data]).toEqual(new Array(width * height).fill([255, 255, 255, 255]).flat());
  });
});
