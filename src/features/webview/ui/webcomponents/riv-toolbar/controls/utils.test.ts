import { describe, expect, it } from 'vitest';

import { TOOLBAR_CONTROLS } from './controls';
import { CONTROL_INTERACTIONS } from './definitions';
import { getControlForElement, mapControlsToValues, respondsTo } from './utils';
import type { ToolbarSyncPayload } from '../state/types';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { ViewerBackground } from '@features/viewer/definitions';

/**
 * One kind of control, so what used to be told apart by shape is now told apart by data: a
 * control answers to the interaction its widget speaks, and shows a value only if it has one.
 */

const sync: ToolbarSyncPayload = {
  zoom: 1,
  background: ViewerBackground.checker,
  options: DEFAULT_DECODE_OPTIONS,
};

function elementFor(id: string): HTMLElement {
  const element = document.createElement('div');

  element.dataset.controlId = id;

  return element;
}

describe('getControlForElement', () => {
  it('finds a control by the id its element carries', () => {
    expect(getControlForElement(elementFor('width'))?.id).toBe('width');
  });

  it.each([
    ['an element of no control', elementFor('nothing')],
    ['an element with no id at all', document.createElement('div')],
    ['nothing', null],
  ])('has no control for %s', (_label, target) => {
    expect(getControlForElement(target)).toBeUndefined();
  });
});

describe('respondsTo', () => {
  it('answers a button on the press, and not on a change', () => {
    const button = TOOLBAR_CONTROLS.find(({ tag }) => tag.tag === 'button')!;

    expect([respondsTo(button, 'click'), respondsTo(button, 'change')]).toEqual([true, false]);
  });

  /** A click opens a select; acting on it would fire the control for merely being looked at. */
  it('answers a select on the change, and not on the click that opened it', () => {
    const select = TOOLBAR_CONTROLS.find(({ tag }) => tag.tag === 'select')!;

    expect([respondsTo(select, 'change'), respondsTo(select, 'click')]).toEqual([true, false]);
  });

  it('knows an interaction for every widget the toolbar can build', () => {
    const widgets = new Set(TOOLBAR_CONTROLS.map(({ tag }) => tag.tag));

    expect([...widgets].every((tag) => CONTROL_INTERACTIONS[tag] !== undefined)).toBe(true);
  });
});

describe('mapControlsToValues', () => {
  it('reads a value for every control that shows one', () => {
    const values = mapControlsToValues(sync);
    const showing = TOOLBAR_CONTROLS.filter(({ toValue }) => toValue !== undefined);

    expect(Object.keys(values).sort()).toEqual(showing.map(({ id }) => id).sort());
  });

  it('leaves the buttons out, which have nothing to show', () => {
    const values = mapControlsToValues(sync);
    const buttons = TOOLBAR_CONTROLS.filter(({ tag }) => tag.tag === 'button');

    expect(buttons.every(({ id }) => !(id in values))).toBe(true);
  });

  it('reads each from the state it belongs to, not only from the decode options', () => {
    const values = mapControlsToValues({ ...sync, background: ViewerBackground.magenta });

    expect([values.background, values.format]).toEqual(['magenta', DEFAULT_DECODE_OPTIONS.format.id]);
  });
});

describe('TOOLBAR_CONTROLS', () => {
  it('gives every control a command, since a control that means nothing cannot be used', () => {
    expect(TOOLBAR_CONTROLS.every(({ toCommand }) => typeof toCommand === 'function')).toBe(true);
  });

  it('keeps the ids unique, which is what every lookup is keyed on', () => {
    const ids = TOOLBAR_CONTROLS.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
