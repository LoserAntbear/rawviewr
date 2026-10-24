import { describe, expect, it } from 'vitest';

import { DEFAULT_DECODE_OPTIONS } from '@SHARED/features/image/imageDecoder/definitions';

import { PRESERVED_OPTION_KEYS } from './types';
import { toPreservedOptions } from './utils';

describe('toPreservedOptions', () => {
  it('carries how the bytes are read', () => {
    const kept = toPreservedOptions({ ...DEFAULT_DECODE_OPTIONS, flipY: true });

    expect(kept).toMatchObject({ flipY: true, format: DEFAULT_DECODE_OPTIONS.format });
  });

  it.each(['width', 'height', 'offset', 'bytesPerRow', 'frame'])('leaves %s behind', (key) => {
    expect(Object.keys(toPreservedOptions(DEFAULT_DECODE_OPTIONS))).not.toContain(key);
  });

  it('carries every key it says it does, and nothing else', () => {
    expect(Object.keys(toPreservedOptions(DEFAULT_DECODE_OPTIONS)).sort())
      .toEqual([...PRESERVED_OPTION_KEYS].sort());
  });
});
