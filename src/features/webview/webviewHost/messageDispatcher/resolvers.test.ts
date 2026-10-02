import { beforeEach, describe, expect, it } from 'vitest';

import { createWebviewStore } from '../../store/createWebviewStore';
import { StoreSliceId } from '../../store/definitions';
import type { AppStore } from '../../store/types';
import { ZOOM } from '../../store/slice/ViewSlice';
import type { ZoomDirection } from '@features/zoom';
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
