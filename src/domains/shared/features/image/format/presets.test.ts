import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PixelFormatPresets } from './presets';
import { FormatDecodersLibrary } from './rowDecoders';

/**
 * Three lists have to agree and nothing but this checks it: the format definitions, the row
 * decoders built from them, and the manifest enum the settings UI offers. A format offered in
 * settings with no preset behind it is picked happily and then fails to decode; one with a
 * preset and no decoder throws on the first row.
 */
type Manifest = {
  contributes: {
    configuration: {
      properties: {
        'rawImageViewer.defaultFormat': { enum: string[]; enumDescriptions: string[] };
      };
    };
  };
};

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as Manifest;
const offered = manifest.contributes.configuration.properties['rawImageViewer.defaultFormat'];
const presetIds = PixelFormatPresets.PRESETS.map(({ id }) => id);

describe('the formats, the manifest and the decoders', () => {
  it('offers exactly the formats that exist, in the same order', () => {
    expect(offered.enum).toEqual(presetIds);
  });

  it('describes every format it offers', () => {
    expect(offered.enumDescriptions).toHaveLength(offered.enum.length);
  });

  it.each(presetIds)('%s has a row decoder', (id) => {
    expect(() => FormatDecodersLibrary.getRowDecoder(id)).not.toThrow();
  });

  it('gives every format a distinct id', () => {
    expect(new Set(presetIds).size).toBe(presetIds.length);
  });
});
