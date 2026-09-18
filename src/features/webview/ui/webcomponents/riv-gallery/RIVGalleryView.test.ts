import { beforeEach, describe, expect, it } from 'vitest';

import { RIVGalleryView } from './RIVGalleryView';
import type { GalleryState } from './state/types';

/**
 * Reconciliation against a real DOM. The loop leans on `insertBefore` treating a node
 * inserted before itself as a no-op — which is spec behaviour a hand-written stub got
 * wrong once already, scrambling the order.
 */

let list: HTMLUListElement;
let view: RIVGalleryView;

beforeEach(() => {
  const root = document.createElement('div').attachShadow({ mode: 'open' });

  root.innerHTML = '<ul id="gallery"></ul>';
  list = root.getElementById('gallery') as HTMLUListElement;
  view = new RIVGalleryView(root);
});

const state = (visibleIds: string[], selectedId: string | null = null, mode: GalleryState['mode'] = 'gallery'): GalleryState => ({
  mode,
  selectedId,
  visibleIds,
});

const ids = () => [...list.children].map((entry) => (entry as HTMLElement).dataset.itemId);

describe('RIVGalleryView', () => {
  it('builds one entry per visible item, each holding a riv-image', () => {
    view.render(state(['a', 'b', 'c']));

    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(list.children[0].firstElementChild?.localName).toBe('riv-image-component');
    expect(list.dataset.viewMode).toBe('gallery');
  });

  it('reuses entries on re-render instead of rebuilding them', () => {
    view.render(state(['a', 'b', 'c']));

    const first = list.children[0];

    view.render(state(['a', 'b', 'c']));

    expect(list.children[0]).toBe(first);
    expect(ids()).toEqual(['a', 'b', 'c']);
  });

  it('moves the original node on a reorder', () => {
    view.render(state(['a', 'b', 'c']));

    const a = list.children[0];

    view.render(state(['b', 'c', 'a']));

    expect(ids()).toEqual(['b', 'c', 'a']);
    expect(list.children[2]).toBe(a);
  });

  it('drops entries that are no longer visible', () => {
    view.render(state(['a', 'b', 'c']));
    view.render(state(['c']));

    expect(ids()).toEqual(['c']);
  });

  it('marks exactly the selected entry', () => {
    view.render(state(['a', 'b', 'c'], 'b'));

    expect([...list.children].map((entry) => entry.classList.contains('selected'))).toEqual([false, true, false]);
  });

  it('resolves an event target to its entry, including from inside the entry', () => {
    view.render(state(['a', 'b']));

    const entry = list.children[1] as HTMLElement;

    expect(view.entryIdFor(entry)).toBe('b');
    expect(view.entryIdFor(entry.firstElementChild)).toBe('b');
    expect(view.entryIdFor(document.createElement('div'))).toBeUndefined();
    expect(view.entryIdFor(null)).toBeUndefined();
  });
});
