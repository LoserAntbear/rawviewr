import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_VIEWER_CONFIGURATION } from '@features/viewer/definitions';

import { createWebviewStore } from '../../createWebviewStore';
import { StoreSliceId } from '../../definitions';
import type { AppStore } from '../../types';

let store: AppStore;

const config = () => store.get(StoreSliceId.Config);

beforeEach(() => {
  ({ store } = createWebviewStore());
});

describe('ConfigSlice', () => {
  it('starts on the defaults, which stand until the host says otherwise', () => {
    expect(config().getState()).toEqual(DEFAULT_VIEWER_CONFIGURATION);
  });

  it('takes what the host sent', () => {
    config().setConfiguration({ tileSize: 160 });

    expect(config().tileSize).toBe(160);
  });

  it('announces a change, so the gallery can re-lay itself out', () => {
    const changed = vi.fn();

    store.bus.on('config:change', (event) => changed(event.detail.next));
    config().setConfiguration({ tileSize: 480 });

    expect(changed).toHaveBeenCalledWith({ tileSize: 480 });
  });

  it('says nothing when the settings arrive unchanged', () => {
    const changed = vi.fn();

    store.bus.on('config:change', changed);
    config().setConfiguration(DEFAULT_VIEWER_CONFIGURATION);

    expect(changed).not.toHaveBeenCalled();
  });

  it('leaves the interaction state alone: a tile size is not a zoom', () => {
    const viewChanged = vi.fn();

    store.bus.on('view:change', viewChanged);
    config().setConfiguration({ tileSize: 480 });

    expect(viewChanged).not.toHaveBeenCalled();
  });
});
