import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WebviewDisposable } from '../../disposable/types';
import type { WebviewMessage } from '../../webviewHost/types';
import { FieldFocusTracker } from './FieldFocusTracker';

/**
 * The guard that keeps a bare `0` from resetting the zoom while the user is typing one into
 * the Width field. The reporter is the only thing that can tell: VS Code resolves the chord
 * outside this frame and cannot see what has focus in it.
 *
 * happy-dom is faithful on the two points that matter — `shadowRoot.activeElement` names the
 * control while `document.activeElement` names its host, and `element.blur()` reaches the
 * window as `focusout`, never as `blur`.
 */

let posted: WebviewMessage[];
let watching: WebviewDisposable[];
let root: ShadowRoot;
let input: HTMLInputElement;
let button: HTMLButtonElement;

const bridge = { postToWebviewHost: (message: WebviewMessage) => posted.push(message) };
const focusState = () => posted
  .filter((message) => message.type === 'view:fieldFocus')
  .map((message) => (message as Extract<WebviewMessage, { type: 'view:fieldFocus' }>).focused);

/** One `window` serves the whole file, so every watcher has to be let go of again. */
function watch(): WebviewDisposable {
  const disposable = new FieldFocusTracker(bridge).watch(window);

  watching.push(disposable);

  return disposable;
}

beforeEach(() => {
  posted = [];
  watching = [];

  // A control inside a shadow root, as every one of ours is.
  const host = document.createElement('div');

  document.body.replaceChildren(host);
  root = host.attachShadow({ mode: 'open' });

  root.innerHTML = '<input id="width" type="number"><button id="go"></button>';
  input = root.getElementById('width') as HTMLInputElement;
  button = root.getElementById('go') as HTMLButtonElement;
});

afterEach(() => {
  for (const disposable of watching) {
    disposable.dispose();
  }
});

describe('FieldFocusReporter', () => {
  it('says where the session starts, rather than leaving the key as the last view left it', () => {
    watch();

    expect(focusState()).toEqual([false]);
  });

  it('reports a control that takes focus inside a shadow root', () => {
    watch();

    input.focus();

    expect(focusState()).toEqual([false, true]);
  });

  it('reports again once the control gives focus up', () => {
    watch();

    input.focus();
    input.blur();

    expect(focusState()).toEqual([false, true, false]);
  });

  it('says nothing when focus moves between things that are not controls', () => {
    watch();

    button.focus();
    button.blur();

    // Both are "no field has focus": a keystroke is a shortcut either way.
    expect(focusState()).toEqual([false]);
  });

  it('stands down when the window loses focus, though the control still holds it', () => {
    watch();

    input.focus();
    window.dispatchEvent(new Event('blur'));

    // Chromium leaves `activeElement` in place, so a hidden view would otherwise hold the
    // key true for whichever view the user moved to.
    expect(focusState()).toEqual([false, true, false]);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('picks the state back up when the window is focused again', () => {
    watch();

    input.focus();
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));

    expect(focusState()).toEqual([false, true, false, true]);
  });

  it('stops reporting once disposed', () => {
    watch().dispose();

    input.focus();

    expect(focusState()).toEqual([false]);
  });

  it('posts nothing else: the host hears about focus and nothing more', () => {
    watch();

    input.focus();

    expect(posted.every(({ type }) => type === 'view:fieldFocus')).toBe(true);
  });
});

describe('FieldFocusReporter: a selection of controls', () => {
  it.each(['select', 'textarea'])('counts a focused <%s> as a field', (tag) => {
    const control = document.createElement(tag) as HTMLElement;

    (document.body.firstElementChild?.shadowRoot as ShadowRoot).append(control);
    watch();

    control.focus();

    expect(focusState()).toEqual([false, true]);
  });
});

describe('FieldFocusReporter: the dedupe', () => {
  it('says nothing when the same field is focused twice over', () => {
    const spy = vi.spyOn(bridge, 'postToWebviewHost');

    watch();
    input.focus();
    input.focus();

    expect(spy).toHaveBeenCalledTimes(2);

    spy.mockRestore();
  });

  /**
   * Focus leaves the first field before the second takes it, and the DOM says so: during
   * `focusout` the active element is already `body`. So a field-to-field move reports the
   * gap, which is honest and harmless — both messages are posted in the same task, in
   * order, and the user's next keystroke is a task of its own, so nothing can be delivered
   * while the key reads false.
   */
  it('reports the gap when focus crosses from one field to another', () => {
    const second = document.createElement('input');

    root.append(second);
    watch();

    input.focus();
    second.focus();

    expect(focusState()).toEqual([false, true, false, true]);
  });
});
