import { describe, expect, it, vi } from 'vitest';

import type { KindStrategies, Strategies } from './types';
import { byKey, byKind } from './utils';

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number };

describe('byKey', () => {
  it('runs the strategy the key names, with the arguments it was given', () => {
    const strategies: Strategies<'a' | 'b', [count: number], string> = {
      a: (count) => `a${count}`,
      b: (count) => `b${count}`,
    };

    expect(byKey(strategies, 'b', 2)).toBe('b2');
  });

  it('leaves the other strategies alone', () => {
    const b = vi.fn();
    const strategies: Strategies<'a' | 'b', [], string> = { a: () => 'a', b };

    byKey(strategies, 'a');

    expect(b).not.toHaveBeenCalled();
  });
});

describe('byKind', () => {
  const area: KindStrategies<Shape, [], number> = {
    // Each strategy sees its own member: `radius` and `width` are both in scope, narrowed.
    circle: ({ radius }) => Math.round(Math.PI * radius * radius),
    rect: ({ width, height }) => width * height,
  };

  it.each([
    [{ kind: 'circle', radius: 2 } as Shape, 13],
    [{ kind: 'rect', width: 3, height: 4 } as Shape, 12],
  ])('hands %o to the strategy for its kind', (shape, expected) => {
    expect(byKind(area, shape)).toBe(expected);
  });

  it('passes the extra arguments through, after the value', () => {
    const scaled: KindStrategies<Shape, [scale: number], number> = {
      circle: ({ radius }, scale) => radius * scale,
      rect: ({ width }, scale) => width * scale,
    };

    expect(byKind(scaled, { kind: 'rect', width: 3, height: 4 }, 10)).toBe(30);
  });
});

describe('exhaustiveness', () => {
  it('is a compile error to leave a member out, which is the point of the pattern', () => {
    // @ts-expect-error -- `rect` is missing, and no amount of running the code would say so.
    const incomplete: KindStrategies<Shape, [], number> = {
      circle: ({ radius }) => radius,
    };

    expect(Object.keys(incomplete)).toEqual(['circle']);
  });
});
