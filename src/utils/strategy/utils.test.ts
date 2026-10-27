import { describe, expect, it, vi } from 'vitest';

import type { FieldStrategies, Strategies } from './types';
import { byField, byKey } from './utils';

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number };

type Outcome =
  | { status: 'success'; id: string }
  | { status: 'failure'; message: string };

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

describe('byField', () => {
  const area: FieldStrategies<Shape, 'kind', [], number> = {
    // Each strategy sees its own member: `radius` and `width` are both in scope, narrowed.
    circle: ({ radius }) => Math.round(Math.PI * radius * radius),
    rect: ({ width, height }) => width * height,
  };

  it.each([
    [{ kind: 'circle', radius: 2 } as Shape, 13],
    [{ kind: 'rect', width: 3, height: 4 } as Shape, 12],
  ])('hands %o to the strategy for its kind', (shape, expected) => {
    expect(byField(area, 'kind', shape)).toBe(expected);
  });

  it('passes the extra arguments through, after the value', () => {
    const scaled: FieldStrategies<Shape, 'kind', [scale: number], number> = {
      circle: ({ radius }, scale) => radius * scale,
      rect: ({ width }, scale) => width * scale,
    };

    expect(byField(scaled, 'kind', { kind: 'rect', width: 3, height: 4 }, 10)).toBe(30);
  });

  /** The reason the field is a parameter: protocol unions discriminate on `status`, not `kind`. */
  it('keys off whichever field it is told to, narrowing the same way', () => {
    const describeOutcome: FieldStrategies<Outcome, 'status', [], string> = {
      success: ({ id }) => `ok:${id}`,
      failure: ({ message }) => `no:${message}`,
    };

    expect(byField(describeOutcome, 'status', { status: 'failure', message: 'nope' })).toBe('no:nope');
  });
});

describe('exhaustiveness', () => {
  it('is a compile error to leave a member out, which is the point of the pattern', () => {
    // @ts-expect-error -- `rect` is missing, and no amount of running the code would say so.
    const incomplete: FieldStrategies<Shape, 'kind', [], number> = {
      circle: ({ radius }) => radius,
    };

    expect(Object.keys(incomplete)).toEqual(['circle']);
  });

  it('is a compile error for the other field too', () => {
    // @ts-expect-error -- `failure` is missing.
    const incomplete: FieldStrategies<Outcome, 'status', [], string> = {
      success: ({ id }) => id,
    };

    expect(Object.keys(incomplete)).toEqual(['success']);
  });
});
