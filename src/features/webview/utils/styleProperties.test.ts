import { beforeEach, describe, expect, it } from 'vitest';

import { applyStyleProperties, toStylePropertyList, type StyleProperty } from './styleProperties';

/**
 * Declaring the properties is the point: applied by hand, each new one is a line somebody
 * has to remember, and taking it off again is a second line in a branch of its own. That
 * branch is where a stale value survives the state that asked for it.
 */

type State = { readonly size: number; readonly colour: string | null };

let element: HTMLElement;

const properties: readonly StyleProperty<State>[] = [
  { name: '--size', resolve: ({ size }) => `${size}px` },
  { name: '--colour', resolve: ({ colour }) => colour },
];

const apply = (state: State) => applyStyleProperties(element.style, properties, state);
const read = (name: string) => element.style.getPropertyValue(name);

beforeEach(() => {
  element = document.createElement('div');
});

describe('applyStyleProperties', () => {
  it('writes every property it was given', () => {
    apply({ size: 12, colour: '#fff' });

    expect([read('--size'), read('--colour')]).toEqual(['12px', '#fff']);
  });

  it('takes a property off when its value is gone, rather than blanking it', () => {
    apply({ size: 12, colour: '#fff' });
    apply({ size: 12, colour: null });

    // Left behind, it would keep overriding whatever the stylesheet says.
    expect(read('--colour')).toBe('');
  });

  it('leaves the others alone while one goes', () => {
    apply({ size: 12, colour: '#fff' });
    apply({ size: 14, colour: null });

    expect(read('--size')).toBe('14px');
  });

  it('writes nothing when given nothing to write', () => {
    applyStyleProperties(element.style, [], { size: 1, colour: null });

    expect(element.getAttribute('style')).toBeNull();
  });
});

describe('toStylePropertyList', () => {
  it('reads out every property of every group, so none is grouped out of sight', () => {
    const list = toStylePropertyList<State>({
      one: [properties[0]],
      two: [properties[1], { name: '--extra', resolve: () => 'x' }],
    });

    expect(list.map(({ name }) => name)).toEqual(['--size', '--colour', '--extra']);
  });

  it('is empty for no groups at all', () => {
    expect(toStylePropertyList<State>({})).toEqual([]);
  });
});
