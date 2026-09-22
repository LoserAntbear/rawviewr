import { beforeEach, describe, expect, it } from 'vitest';

import type { BufferItemData } from '@features/buffer';
import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';

import { createWebviewStore } from './createWebviewStore';
import { StoreEvent, StoreSliceId } from './definitions';
import { STORE_SELECTORS } from './selectors';
import { SourcesSlice } from './slice/SourcesSlice/SourcesSlice';
import type { AppStore } from './types';

const registry = new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format);

const item = (id: string, bytes = 8): BufferItemData => ({ id, name: `${id}.raw`, data: new ArrayBuffer(bytes) });

let store: AppStore;

const items = () => store.get(StoreSliceId.Sources);
const view = () => store.get(StoreSliceId.View);

function countEvents(type: string): () => number {
  let count = 0;

  store.bus.addEventListener(type, () => {
    count++;
  });

  return () => count;
}

beforeEach(() => {
  ({ store } = createWebviewStore(registry));
});

describe('registry', () => {
  it('hands back each slice by its id', () => {
    expect(items()).toBeInstanceOf(SourcesSlice);
    expect(store.has(StoreSliceId.Decode)).toBe(true);
  });

  it('refuses to register the same id twice', () => {
    expect(() => store.register(new SourcesSlice())).toThrow(/already registered/);
  });

  it('assembles the whole app state keyed by slice id, with each slice\'s own state', () => {
    items().upsert([item('a'), item('b')]);

    const { state } = store;

    expect(Object.keys(state).sort()).toEqual(['decode', 'images', 'items', 'view']);
    expect([...state[StoreSliceId.Sources].byId.keys()]).toEqual(['a', 'b']);
    expect(state[StoreSliceId.Decode].format).toBe(DEFAULT_DECODE_OPTIONS.format);
  });
});

describe('slices', () => {
  it('stay silent on a no-op patch, so reactions converge instead of ping-ponging', () => {
    const viewChanges = countEvents(StoreEvent.ViewChange);
    const decodeChanges = countEvents(StoreEvent.DecodeChange);

    view().setMode('single');
    store.get(StoreSliceId.Decode).setOptions({ width: 0 });

    expect([viewChanges(), decodeChanges()]).toEqual([0, 0]);

    view().setMode('gallery');
    store.get(StoreSliceId.Decode).setOptions({ width: 64 });

    expect([viewChanges(), decodeChanges()]).toEqual([1, 1]);
  });

  it('are copy-on-write: an upsert changes identity only for the item it touched', () => {
    items().upsert([item('a'), item('b')]);

    const before = items().getState().byId;

    items().upsert([item('a', 4096)]);

    const after = items().getState().byId;

    expect(after.get('a')).not.toBe(before.get('a'));
    expect(after.get('b')).toBe(before.get('b'));
    expect(before.get('a')?.data.byteLength).toBe(8);
    expect(items().ids).toEqual(['a', 'b']);
  });
});

describe('selectors', () => {
  beforeEach(() => items().upsert([item('a'), item('b')]));

  it('show the selection in single mode and everything in gallery mode', () => {
    expect(store.selectors.visibleIds()).toEqual(['a']);

    view().setMode('gallery');

    expect(store.selectors.visibleIds()).toEqual(['a', 'b']);
  });

  it('are pure functions of a snapshot when used unbound', () => {
    const snapshot = {
      ...store.state,
      [StoreSliceId.Sources]: { byId: new Map([['z', item('z')]]) },
      [StoreSliceId.View]: { mode: 'gallery' as const, selectedId: null },
    };

    expect(STORE_SELECTORS.visibleIds(snapshot)).toEqual(['z']);
    expect(store.selectors.visibleIds()).toEqual(['a']);
  });
});

describe('reactions', () => {
  it('select the first item when one arrives', () => {
    expect(view().selectedId).toBeNull();

    items().upsert([item('x'), item('y')]);

    expect(view().selectedId).toBe('x');
  });

  it('never leave the selection pointing at an item that is gone', () => {
    items().upsert([item('x'), item('y')]);

    items().remove('x');
    expect(view().selectedId).toBe('y');

    items().remove('y');
    expect(view().selectedId).toBeNull();
    expect(store.selectors.visibleIds()).toEqual([]);
  });

  it('leave a valid selection alone', () => {
    items().upsert([item('a')]);

    const viewChanges = countEvents(StoreEvent.ViewChange);

    items().upsert([item('a'), item('c')]);

    expect(viewChanges()).toBe(0);
    expect(view().selectedId).toBe('a');
  });
});
