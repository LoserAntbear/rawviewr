import { beforeEach, describe, expect, it } from 'vitest';

import { ViewerBackground } from '@features/viewer/definitions';

import { GALLERY_STYLE_PROPERTIES } from './definitions';

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

const state = (
  visibleIds: string[],
  selectedId: string | null = null,
  mode: GalleryState['mode'] = 'gallery',
  zoom = 1,
  background: ViewerBackground = ViewerBackground.checker,
  tileSize = 220,
): GalleryState => ({
  mode,
  zoom,
  tileSize,
  background,
  selectedId,
  visibleIds,
});

const styleOf = (property: string) => list.style.getPropertyValue(property);

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

  /**
   * The tiles keep their own shadow roots, so an inherited custom property is the only way
   * a zoom reaches their canvases. It goes on the list once, not on each entry.
   */
  it('hands the zoom factor down the list, and updates it in place', () => {
    view.render(state(['a', 'b'], null, 'single', 4));

    expect(list.style.getPropertyValue('--riv-image-scale')).toBe('4');

    view.render(state(['a', 'b'], null, 'single', 0.5));

    expect(list.style.getPropertyValue('--riv-image-scale')).toBe('0.5');
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

/**
 * Settings reach the tiles the same way the zoom does: one property on the list, which every
 * tile inherits through its own shadow root. A gallery can hold thousands of them, so it is
 * one write per change rather than one per tile.
 */
describe('RIVGalleryView: what the settings paint', () => {
  /**
   * The guarantee the declared set buys: a property that is added but never applied, or one
   * applied in a branch that a state happens to skip, shows up here rather than on screen.
   */
  it('writes every property it declares, on one render', () => {
    view.render(state(['a'], null, 'gallery', 2, ViewerBackground.black, 320));

    const written = GALLERY_STYLE_PROPERTIES.map(({ name }) => [name, styleOf(name)]);

    expect(written.filter(([, value]) => value === '')).toEqual([]);
    expect(written).toHaveLength(GALLERY_STYLE_PROPERTIES.length);
  });

  it('hands the tile size down in pixels', () => {
    view.render(state(['a'], null, 'gallery', 1, ViewerBackground.checker, 320));

    expect(styleOf('--riv-tile')).toBe('320px');
  });

  it.each([
    [ViewerBackground.black, '#000000'],
    [ViewerBackground.white, '#ffffff'],
    [ViewerBackground.magenta, '#ff00ff'],
  ])('paints a solid %s backdrop and turns the checkerboard off', (background, color) => {
    view.render(state(['a'], null, 'gallery', 1, background));

    expect([styleOf('--riv-image-backdrop'), styleOf('--riv-image-backdrop-pattern')])
      .toEqual([color, 'none']);
  });

  it('lets the editor show through rather than painting over it', () => {
    view.render(state(['a'], null, 'gallery', 1, ViewerBackground.editor));

    expect(styleOf('--riv-image-backdrop')).toBe('transparent');
  });

  it('names nothing for the checkerboard, which is what the stylesheet already draws', () => {
    view.render(state(['a'], null, 'gallery', 1, ViewerBackground.checker));

    expect([styleOf('--riv-image-backdrop'), styleOf('--riv-image-backdrop-pattern')]).toEqual(['', '']);
  });

  it('takes a backdrop back off when the setting returns to the checkerboard', () => {
    view.render(state(['a'], null, 'gallery', 1, ViewerBackground.black));
    view.render(state(['a'], null, 'gallery', 1, ViewerBackground.checker));

    // Left behind, the colour would hide the checkerboard it fell back to.
    expect(styleOf('--riv-image-backdrop')).toBe('');
  });
});
