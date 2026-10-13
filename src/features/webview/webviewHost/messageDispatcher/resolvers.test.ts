import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SourceBytesResult } from '@features/image/sourceReader/types';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { toPreservedOptions } from '@features/settings/snapshot';
import { ViewerBackground } from '@features/viewer/definitions';
import type { ZoomDirection } from '@features/zoom';

import { createWebviewStore } from '../../store/createWebviewStore';
import { StoreSliceId } from '../../store/definitions';
import type { AppStore } from '../../store/types';
import { ZOOM } from '../../store/slice/ViewSlice';

import { WEBVIEW_HOST_MESSAGE_RESOLVERS } from './resolvers';

/**
 * What the host sends, written into the store. A keybinding is the only zoom the webview
 * cannot see for itself, and it arrives here — on the same slice method the toolbar uses, so
 * the caps and the stepping are already the ones everything else obeys.
 */
let store: AppStore;

beforeEach(() => {
  ({ store } = createWebviewStore());
});

/** A resolver may be async, so it is awaited here even though this one writes and returns. */
async function zoom(direction: ZoomDirection): Promise<void> {
  await WEBVIEW_HOST_MESSAGE_RESOLVERS['view:zoom'](
    { type: 'view:zoom', direction },
    { store, bridge: { postToWebviewHost: () => undefined } },
  );
}

describe('WEBVIEW_HOST_MESSAGE_RESOLVERS: view:zoom', () => {
  it('steps the view the way the keystroke asked', async () => {
    await zoom('in');

    expect(store.get(StoreSliceId.View).zoom).toBe(2);
  });

  it('obeys the same caps as every other way in', async () => {
    for (let step = 0; step < 10; step += 1) {
      await zoom('in');
    }

    expect(store.get(StoreSliceId.View).zoom).toBe(ZOOM.max);
  });

  it('returns to 1:1', async () => {
    await zoom('out');
    await zoom('reset');

    expect(store.get(StoreSliceId.View).zoom).toBe(ZOOM.default);
  });
});

describe('WEBVIEW_HOST_MESSAGE_RESOLVERS: probe:receive:source-bytes', () => {
  const location = { bits: 16, bitOffset: 0, byteOffset: 6 } as const;
  const sample = { id: 'a', position: { x: 3, y: 4 }, rgba: { r: 1, g: 2, b: 3, a: 255 }, location };

  const answer = async (result: SourceBytesResult = { kind: 'received', bytes: { bytes: [0x3c, 0x1f], value: 0x1f3c } }) =>
    WEBVIEW_HOST_MESSAGE_RESOLVERS['probe:receive:source-bytes'](
      { type: 'probe:receive:source-bytes', id: 'a', location, result },
      { store, bridge: { postToWebviewHost: () => undefined } },
    );

  it('fills in the bytes the webview could not read for itself', async () => {
    store.get(StoreSliceId.Probe).togglePinnedSample(sample);

    await answer();

    expect(store.get(StoreSliceId.Probe).pinnedSample?.sourceFileBytes)
      .toEqual({ kind: 'received', bytes: { bytes: [0x3c, 0x1f], value: 0x1f3c } });
  });

  it('drops an answer that no longer matches what is pinned', async () => {
    await answer();

    // Nothing was pinned, so there is nothing the answer belongs to.
    expect(store.get(StoreSliceId.Probe).pinnedSample).toBeNull();
  });
});

describe('WEBVIEW_HOST_MESSAGE_RESOLVERS: session:start', () => {
  it('opens the view on the backdrop the settings chose', async () => {
    await WEBVIEW_HOST_MESSAGE_RESOLVERS['session:start'](
      {
        type: 'session:start',
        viewMode: 'single',
        background: ViewerBackground.magenta,
        decodeOptions: DEFAULT_DECODE_OPTIONS,
      },
      { store, bridge: { postToWebviewHost: () => undefined } },
    );

    expect(store.get(StoreSliceId.View).background).toBe(ViewerBackground.magenta);
  });
});

/**
 * The toolbar the host keeps, pushed to every view. The guard against re-sending it is the
 * whole reason this is not a loop: two open views would otherwise hand the same options back
 * and forth for as long as they were both open.
 */
describe('WEBVIEW_HOST_MESSAGE_RESOLVERS: decode:options:preserved', () => {
  /** The format is copied, as a snapshot that has been through `postMessage` would be. */
  const snapshot = (preserved: boolean, flipY = true) => ({
    preserved,
    options: {
      ...toPreservedOptions(DEFAULT_DECODE_OPTIONS),
      flipY,
      format: { ...DEFAULT_DECODE_OPTIONS.format },
    },
  });

  const preserved = async (value: boolean, flipY?: boolean) =>
    WEBVIEW_HOST_MESSAGE_RESOLVERS['decode:options:preserved'](
      { type: 'decode:options:preserved', snapshot: snapshot(value, flipY) },
      { store, bridge: { postToWebviewHost: () => undefined } },
    );

  it('shows the toggle as the host has it', async () => {
    await preserved(true);

    expect(store.get(StoreSliceId.Config).preserveOptionsForAllWindows).toBe(true);
  });

  it('takes the toolbar it was handed', async () => {
    await preserved(true);

    expect(store.get(StoreSliceId.DecodeOptions).options).toMatchObject({ flipY: true });
  });

  it('leaves the geometry alone, which belongs to the file rather than the toolbar', async () => {
    store.get(StoreSliceId.DecodeOptions).setOptions({ width: 64, height: 64 });

    await preserved(true);

    expect(store.get(StoreSliceId.DecodeOptions).options).toMatchObject({ width: 64, height: 64 });
  });

  it('leaves the toolbar alone when nothing is being preserved', async () => {
    const before = store.get(StoreSliceId.DecodeOptions).options;

    await preserved(false);

    expect(store.get(StoreSliceId.DecodeOptions).options).toBe(before);
  });

  it('says nothing further when the toolbar it was handed is the one it already has', async () => {
    await preserved(true);

    const changed = vi.fn();

    store.bus.on('decodeOptions:change', changed);
    await preserved(true);

    // A copy that read as a change would be sent straight back to the host.
    expect(changed).not.toHaveBeenCalled();
  });
});
