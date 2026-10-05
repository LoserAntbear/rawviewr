import { beforeEach, describe, expect, it } from 'vitest';

import { PixelFormatPresets } from '@features/image/format/presets';
import { Endian } from '@definitions/bits';

import { createWebviewStore } from '../../store/createWebviewStore';
import { StoreSliceId } from '../../store/definitions';
import type { AppStore } from '../../store/types';
import type { FileSource } from '../../types';
import { STORE_EVENT_FORWARDS } from './forwards';

/**
 * The table is a translation and nothing else — it reads the store and returns a message,
 * so it needs no channel to be tested.
 */

const source = (id: string): FileSource => ({ id, name: `${id}.raw`, uri: { path: `/${id}.raw` } as never });

let store: AppStore;

beforeEach(() => {
  ({ store } = createWebviewStore());
  store.get(StoreSliceId.Sources).upsert([source('a'), source('b')]);
});

const forward = (ids: readonly string[]) =>
  STORE_EVENT_FORWARDS['images:decode:requested']?.({ ids }, { store, bridge: { postToWebviewHost: () => undefined } });

describe('STORE_EVENT_FORWARDS: images:decode:requested', () => {
  it('asks the host to decode those sources, under the options of the moment', () => {
    store.get(StoreSliceId.DecodeOptions).setOptions({ format: PixelFormatPresets.getPreset('rgb565') });

    expect(forward(['a'])).toEqual({
      type: 'sources:request:decode',
      ids: [source('a')],
      options: expect.objectContaining({ format: expect.objectContaining({ id: 'rgb565' }) }),
    });
  });

  it('carries every id it was given, in the order it was given them', () => {
    expect(forward(['b', 'a'])).toMatchObject({ ids: [source('b'), source('a')] });
  });

  it('drops an id the store has no source for, rather than sending a hole', () => {
    expect(forward(['a', 'gone'])).toMatchObject({ ids: [source('a')] });
  });
});

describe('STORE_EVENT_FORWARDS: probe:receive:source-bytes:requested', () => {
  const location = { bits: 16, bitOffset: 0, byteOffset: 6 } as const;

  const forwardProbe = () => STORE_EVENT_FORWARDS['probe:receive:source-bytes:requested']?.(
    { id: 'a', location },
    { store, bridge: { postToWebviewHost: () => undefined } },
  );

  it('asks the host to read that location, under the byte order in force', () => {
    store.get(StoreSliceId.DecodeOptions).setOptions({ endian: Endian.Big });

    expect(forwardProbe()).toEqual({
      id: 'a',
      location,
      type: 'probe:request',
      endian: Endian.Big,
    });
  });

  it('carries the endian of the moment, not the one the pin was made under', () => {
    store.get(StoreSliceId.DecodeOptions).setOptions({ endian: Endian.Little });

    expect(forwardProbe()).toMatchObject({ endian: Endian.Little });
  });
});
