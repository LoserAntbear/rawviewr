import { describe, expect, it } from 'vitest';

import { readElementValue } from './utils';

function select(...values: string[]): HTMLSelectElement {
  const element = document.createElement('select');

  for (const value of values) {
    const option = document.createElement('option');

    option.value = value;
    element.append(option);
  }

  return element;
}

/**
 * Picks an option the way a user does — by changing which option is selected.
 *
 * Not `element.value = x`: happy-dom implements that setter by defining an own `value`
 * property on the instance, which no browser does. Driving a select that way would make
 * `Object.hasOwn(element, 'value')` true and hide exactly the bug this file guards against.
 */
function choose(element: HTMLSelectElement, value: string): void {
  for (const option of element.options) {
    option.selected = option.value === value;
  }
}

function input(type: string, value?: string): HTMLInputElement {
  const element = document.createElement('input');

  element.type = type;

  if (value !== undefined) {
    element.value = value;
  }

  return element;
}

describe('readElementValue', () => {
  it('runs against elements whose `value` is an accessor, as in a browser', () => {
    // Checked *after* each element is driven the way the tests below drive it, since that
    // is where an environment can quietly turn `value` into an own property.
    const dropdown = select('a', 'b');

    choose(dropdown, 'b');

    expect(Object.hasOwn(dropdown, 'value')).toBe(false);
    expect(Object.hasOwn(input('number', '640'), 'value')).toBe(false);
  });

  it('reads a select', () => {
    const element = select('rgba4444', 'rgb565');

    choose(element, 'rgb565');

    expect(readElementValue(element)).toBe('rgb565');
  });

  it('reads a number input', () => {
    expect(readElementValue(input('number', '640'))).toBe('640');
  });

  it('reads a checkbox from `checked`, not `value`', () => {
    const element = input('checkbox');

    element.checked = true;
    expect(readElementValue(element)).toBe('true');

    element.checked = false;
    expect(readElementValue(element)).toBe('');
  });

  it('reports nothing for an element that holds no value', () => {
    expect(readElementValue(document.createElement('button'))).toBe('');
    expect(readElementValue(document.createElement('div'))).toBe('');
  });
});
