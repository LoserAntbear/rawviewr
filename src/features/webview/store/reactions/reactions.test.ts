import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PixelFormatPresets } from '@features/image/format/presets';

import { WebviewSessionCommunicationBridge } from '../../session/WebviewSessionCommunicationBridge';
import { STORE_EVENT_FORWARDS } from '../../webviewHost/messageDispatcher';
import { createWebviewStore } from '../createWebviewStore';
import { StoreSliceId } from '../definitions';
import type { AppStore } from '../types';
import type { FileSource } from '../../types';

/**
 * The store says what it needs in its own words. Carrying that to the host is the bridge's,
 * so the last test here is the whole chain: an option moves, the host hears about it.
 */

const source = (id: string): FileSource => ({ id, name: `${id}.raw`, uri: { path: `/${id}.raw` } as never });

let store: AppStore;

beforeEach(() => {
  ({ store } = createWebviewStore());
});

describe('requestDecodeOnOptionsChange', () => {
  it('asks for every source again when an option moves, since no bytes were kept', () => {
    const asked = vi.fn();

    store.get(StoreSliceId.Sources).upsert([source('a'), source('b')]);
    store.bus.on('images:decode:requested', (event) => asked(event.detail));

    store.get(StoreSliceId.DecodeOptions).setOptions({ width: 2 });

    expect(asked).toHaveBeenCalledWith({ ids: ['a', 'b'] });
  });

  it('says nothing when there are no sources to decode', () => {
    const asked = vi.fn();

    store.bus.on('images:decode:requested', asked);
    store.get(StoreSliceId.DecodeOptions).setOptions({ width: 2 });

    expect(asked).not.toHaveBeenCalled();
  });

  it('says nothing when an option is set to what it already was', () => {
    const asked = vi.fn();

    store.get(StoreSliceId.Sources).upsert([source('a')]);
    store.bus.on('images:decode:requested', asked);

    store.get(StoreSliceId.DecodeOptions).setOptions({ width: store.get(StoreSliceId.DecodeOptions).options.width });

    expect(asked).not.toHaveBeenCalled();
  });
});

describe('the decode request, end to end', () => {
  it('reaches the host as one message, with the sources and the new options', () => {
    const post = vi.fn();
    const bridge = new WebviewSessionCommunicationBridge({ postMessage: post } as never);

    bridge.forwardFrom(store.bus, STORE_EVENT_FORWARDS, { store });
    store.get(StoreSliceId.Sources).upsert([source('a')]);

    store.get(StoreSliceId.DecodeOptions).setOptions({ format: PixelFormatPresets.getPreset('gray8') });

    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith({
      type: 'sources:request:decode',
      ids: [source('a')],
      options: expect.objectContaining({ format: expect.objectContaining({ id: 'gray8' }) }),
    });
  });
});
