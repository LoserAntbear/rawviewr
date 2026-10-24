import { describe, expect, it } from 'vitest';

import { PixelFormatPresets } from '@SHARED/features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@SHARED/features/image/imageDecoder/definitions';
import type { DecodeOptions } from '@SHARED/features/image/imageDecoder/types';

import { SnapshotValidator } from './snapshotValidator';
import { toPreservedOptions } from './utils';

/**
 * A snapshot arriving from the host is a copy, so nothing about it can be compared by
 * identity. Without this, a pushed toolbar would read as a fresh change and be sent straight
 * back — and two open views would hand the same options to each other forever.
 */

const options = (overrides: Partial<DecodeOptions> = {}): DecodeOptions => ({
  ...DEFAULT_DECODE_OPTIONS,
  ...overrides,
});

const copyOf = (source: DecodeOptions) => ({
  ...toPreservedOptions(source),
  format: { ...source.format },
});

describe('SnapshotValidator.areSameOptions', () => {
  it('reads a copy as the same, which is what comes back over a message', () => {
    const current = options({ flipY: true });

    expect(SnapshotValidator.areSameOptions(current, copyOf(current))).toBe(true);
  });

  it('tells a different format apart, though the copy looks alike', () => {
    const current = options();
    const next = copyOf(options({ format: PixelFormatPresets.getPreset('gray8') }));

    expect(SnapshotValidator.areSameOptions(current, next)).toBe(false);
  });

  /** Flipped from whatever the default is, so the fixture cannot agree with it by accident. */
  it.each(['flipY', 'bitOrderMsb', 'unpremultiply'] as const)('tells %s apart', (key) => {
    const flipped = options({ [key]: !DEFAULT_DECODE_OPTIONS[key] });

    expect(SnapshotValidator.areSameOptions(options(), copyOf(flipped))).toBe(false);
  });

  it('ignores the geometry, which a snapshot never speaks for', () => {
    const current = options({ width: 640, height: 480, offset: 8 });

    // Differing only where the snapshot says nothing still means "already showing this".
    expect(SnapshotValidator.areSameOptions(current, copyOf(options()))).toBe(true);
  });
});
