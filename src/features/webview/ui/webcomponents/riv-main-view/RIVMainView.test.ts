import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { RIV_COMMAND_EVENT_ID } from '@features/webview/commands/definitions';
import type { WebviewMessage } from '@features/webview/webviewHost/types';

import { RIVMainView } from './index';

/**
 * The viewport mounted for real, driven by the gesture VS Code cannot forward: there is no
 * mouse API in the extension host, so ctrl+wheel is ours to capture or lose.
 *
 * happy-dom builds a `WheelEvent` but drops the modifier keys from its init, so `ctrlKey`
 * is put on each event by hand — the only thing stubbed here.
 */

let view: RIVMainView;
let commands: WebviewMessage[];
let listening: AbortController;

beforeAll(() => {
  customElements.define(RIVMainView.tagName, RIVMainView);
});

beforeEach(() => {
  commands = [];
  listening = new AbortController();

  view = document.createElement(RIVMainView.tagName) as RIVMainView;
  document.body.replaceChildren(view);

  // Where the dispatcher listens: a command has to cross the shadow boundary to get there.
  // One `document` serves the file, so the listener goes when the test does — otherwise a
  // listener left behind writes into the next test's commands.
  document.addEventListener(RIV_COMMAND_EVENT_ID, (event) => {
    commands.push((event as CustomEvent<WebviewMessage>).detail);
  }, { signal: listening.signal });
});

afterEach(() => {
  listening.abort();
});

function wheel(deltaY: number, modifier?: 'ctrlKey' | 'metaKey'): WheelEvent {
  const event = new WheelEvent('wheel', { deltaY, bubbles: true, composed: true, cancelable: true });

  if (modifier) {
    Object.defineProperty(event, modifier, { value: true });
  }

  // From the gallery inside the viewport, as a wheel over the image itself arrives: the
  // listener sits on the scroll container, so the event has to reach it by bubbling.
  const over = view.shadowRoot?.getElementById('main-view')?.firstElementChild;

  if (!over) {
    throw new Error('riv-main-view: nothing inside #main-view to wheel over');
  }

  over.dispatchEvent(event);

  return event;
}

describe('riv-main-view: the zoom gesture', () => {
  it.each([
    ['ctrlKey', -100, 'in'],
    ['ctrlKey', 100, 'out'],
    ['metaKey', -100, 'in'],
  ] as const)('a %s wheel of %i asks the view to zoom %s', (modifier, deltaY, direction) => {
    const event = wheel(deltaY, modifier);

    expect(commands).toEqual([{ type: 'view:zoom', direction }]);
    // Taken off Chromium, which would otherwise zoom the whole page.
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves a plain wheel alone, so the viewport still scrolls', () => {
    const event = wheel(-100);

    expect(commands).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('answers the smallest delta a trackpad can report, at once', () => {
    wheel(-1, 'ctrlKey');

    // No distance to gather: one pixel one way is still that way.
    expect(commands).toEqual([{ type: 'view:zoom', direction: 'in' }]);
  });

  it('ignores a horizontal-only wheel, which zooms nothing', () => {
    const event = wheel(0, 'ctrlKey');

    expect(commands).toEqual([]);
    // Still taken: a sideways swipe with ctrl held is not Chromium's to act on either.
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('riv-main-view: the pace of a held gesture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('steps once for a flurry of pinch events, then again once the window passes', () => {
    wheel(-4, 'ctrlKey');
    wheel(-4, 'ctrlKey');
    wheel(-4, 'ctrlKey');

    expect(commands).toHaveLength(1);

    vi.advanceTimersByTime(150);
    wheel(-4, 'ctrlKey');

    expect(commands).toHaveLength(2);
  });

  it('keeps taking the gesture while it is throttled, so the page never zooms', () => {
    wheel(-4, 'ctrlKey');

    const dropped = wheel(-4, 'ctrlKey');

    expect(commands).toHaveLength(1);
    expect(dropped.defaultPrevented).toBe(true);
  });

  it('lets a reversal through as soon as the window allows, in the new direction', () => {
    wheel(-4, 'ctrlKey');
    vi.advanceTimersByTime(150);
    wheel(4, 'ctrlKey');

    expect(commands).toEqual([
      { type: 'view:zoom', direction: 'in' },
      { type: 'view:zoom', direction: 'out' },
    ]);
  });
});
