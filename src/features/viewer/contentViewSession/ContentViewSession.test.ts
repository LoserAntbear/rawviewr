import { describe, expect, it } from 'vitest';

import type { FileSource } from '../types';

import { ContentViewSession } from './ContentViewSession';

/**
 * The host used to carry a bare array and search it. What matters here is the lookup: it is the
 * only thing standing between a message naming an id and a file on disk.
 */
const source = (id: string): FileSource => ({ id, name: `${id}.raw`, uri: { path: `/${id}.raw` } as never });

describe('ContentViewSession', () => {
  it('keeps the sources in the order it was given them', () => {
    const session = new ContentViewSession('gallery', [source('b'), source('a')]);

    expect(session.sources.map(({ id }) => id)).toEqual(['b', 'a']);
  });

  it('keeps the mode the view was opened in', () => {
    expect(new ContentViewSession('single', []).viewMode).toBe('single');
  });

  it('answers with the source an id names', () => {
    const session = new ContentViewSession('gallery', [source('a'), source('b')]);

    expect(session.sourceFor('b')?.name).toBe('b.raw');
  });

  /** An id nothing answers to is how a message naming a file nobody opened comes to nothing. */
  it('answers with nothing for an id it does not hold', () => {
    expect(new ContentViewSession('gallery', [source('a')]).sourceFor('/etc/passwd')).toBeUndefined();
  });

  it('finds the last source as readily as the first', () => {
    const sources = Array.from({ length: 2_000 }, (_, index) => source(String(index)));
    const session = new ContentViewSession('gallery', sources);

    expect([session.sourceFor('0')?.id, session.sourceFor('1999')?.id]).toEqual(['0', '1999']);
  });
});
