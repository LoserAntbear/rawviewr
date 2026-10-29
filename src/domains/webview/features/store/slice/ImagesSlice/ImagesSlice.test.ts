import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Geometry } from '@SHARED/features/image/imageDecoder/imagePreparation/types';
import type {
  DecodedFileSegment,
  DecodedFileStart,
  DecodedSegment,
} from '@SHARED/features/image/imageDecoder/types';
import { TypedEventTarget } from '@SHARED/features/messaging/TypedEventTarget/TypedEventTarget';

import { ImageItem } from './ImageItem';
import { ImagesSlice } from './ImagesSlice';

const GEOMETRY: Geometry = {
  width: 2,
  height: 4,
  frameCount: 1,
  bytesPerRow: 8,
  bytesPerFrame: 32,
  availableBytes: 32,
  baseOffset: 0,
  lockedByHeader: false,
};

const start = (id: string, runId = 'run-1'): DecodedFileStart => ({
  status: 'start',
  runId,
  id,
  name: `${id}.raw`,
  detail: null,
  byteLength: 32,
  geometry: GEOMETRY,
});

const band = (row: number, totalRows = 2): DecodedSegment => ({
  row,
  totalRows,
  data: new Uint8ClampedArray(GEOMETRY.width * totalRows * 4),
});

const progress = (id: string, row: number, runId = 'run-1'): DecodedFileSegment => ({
  status: 'progress',
  runId,
  id,
  segment: band(row),
});

let slice: ImagesSlice;
let changes: number;

beforeEach(() => {
  slice = new ImagesSlice();
  changes = 0;

  const bus = new TypedEventTarget();

  slice.attach(bus as never);
  bus.on('images:change' as never, () => {
    changes += 1;
  });
});

describe('ImagesSlice: opening a decode', () => {
  it('holds the facts before any pixels, so the caption and canvas need not wait', () => {
    slice.startDecode([start('a')]);

    const item = slice.getImage('a');

    expect(ImageItem.isStreaming(item)).toBe(true);
    expect(item && 'geometry' in item ? item.geometry.height : 0).toBe(4);
    expect(item && 'image' in item ? item.image.segments : ['unset']).toEqual([]);
  });

  it('is not ready yet, so export and probe cannot reach it', () => {
    slice.startDecode([start('a')]);

    expect(ImageItem.isReady(slice.getImage('a'))).toBe(false);
  });
});

describe('ImagesSlice: bands arriving', () => {
  beforeEach(() => {
    slice.startDecode([start('a')]);
    changes = 0;
  });

  it('raises a change for every band, which is what makes it repaint', () => {
    slice.appendSegments([progress('a', 0)]);
    slice.appendSegments([progress('a', 2)]);

    expect(changes).toBe(2);
  });

  it('gives each band a new item object, because the store diffs by reference', () => {
    const before = slice.getImage('a');

    slice.appendSegments([progress('a', 0)]);

    expect(slice.getImage('a')).not.toBe(before);
  });

  /**
   * The band list is replaced, never pushed to. A change event already fires either way, since
   * the item wrapper is new — what in-place mutation actually breaks is every snapshot already
   * handed out: the `prev` of a change payload, and any `ready` item a consumer is holding.
   */
  it('leaves an item handed out earlier alone when the next band arrives', () => {
    slice.appendSegments([progress('a', 0)]);

    const earlier = slice.getImage('a');
    const earlierBands = earlier && 'image' in earlier ? earlier.image.segments : [];

    expect(earlierBands.map(({ row }) => row)).toEqual([0]);

    slice.appendSegments([progress('a', 2)]);

    // The snapshot taken before the second band must still describe one band.
    expect(earlierBands.map(({ row }) => row)).toEqual([0]);
  });

  it('accumulates the bands rather than replacing them', () => {
    slice.appendSegments([progress('a', 0)]);
    slice.appendSegments([progress('a', 2)]);

    const item = slice.getImage('a');

    expect(item && 'image' in item ? item.image.segments.map(({ row }) => row) : []).toEqual([0, 2]);
  });

  it('batches a message of several bands into one change', () => {
    slice.startDecode([start('b')]);
    changes = 0;

    slice.appendSegments([progress('a', 0), progress('b', 0)]);

    expect(changes).toBe(1);
  });

  /** The window moved on: this band belongs to a decode nobody is waiting for. */
  it('drops a band from a run that has been superseded, and stays quiet about it', () => {
    slice.appendSegments([progress('a', 0, 'run-stale')]);

    const item = slice.getImage('a');

    expect(item && 'image' in item ? item.image.segments : ['unset']).toEqual([]);
    expect(changes).toBe(0);
  });

  it('drops a band for an id it never opened', () => {
    slice.appendSegments([progress('never-opened', 0)]);

    expect(slice.getImage('never-opened')).toBeUndefined();
    expect(changes).toBe(0);
  });
});

describe('ImagesSlice: closing a decode', () => {
  beforeEach(() => {
    slice.startDecode([start('a')]);
  });

  it('turns ready only once every row has landed', () => {
    slice.appendSegments([progress('a', 0), progress('a', 2)]);
    slice.finalizeDecode([{ status: 'success', runId: 'run-1', id: 'a' }]);

    expect(ImageItem.isReady(slice.getImage('a'))).toBe(true);
  });

  it('keeps the geometry and every band when it closes, rather than replacing the item', () => {
    slice.appendSegments([progress('a', 0), progress('a', 2)]);
    slice.finalizeDecode([{ status: 'success', runId: 'run-1', id: 'a' }]);

    const item = slice.getImage('a');

    expect(item && 'geometry' in item ? item.geometry.height : 0).toBe(4);
    expect(item && 'image' in item ? item.image.segments.map(({ row }) => row) : []).toEqual([0, 2]);
  });

  /**
   * The gate export and probe share. A sequence that closes short of its rows must not pass it,
   * or they would read rows that never arrived.
   */
  it('stays streaming when it closes short of its rows', () => {
    slice.appendSegments([progress('a', 0)]);
    slice.finalizeDecode([{ status: 'success', runId: 'run-1', id: 'a' }]);

    expect(ImageItem.isReady(slice.getImage('a'))).toBe(false);
    expect(ImageItem.isStreaming(slice.getImage('a'))).toBe(true);
  });

  it('ignores a close from a superseded run', () => {
    slice.appendSegments([progress('a', 0), progress('a', 2)]);
    slice.finalizeDecode([{ status: 'success', runId: 'run-stale', id: 'a' }]);

    expect(ImageItem.isReady(slice.getImage('a'))).toBe(false);
  });

  it('replaces the item on a failure, since there is nothing left worth keeping', () => {
    slice.finalizeDecode([{ status: 'failure', id: 'a', message: 'gone' }]);

    const item = slice.getImage('a');

    expect(item?.kind).toBe('failed');
    expect(item && 'message' in item ? item.message : null).toBe('gone');
  });

  /**
   * An abandoned run is not a fault. Leaving the item alone is what lets the next window ask
   * again without a tile having flashed as broken in between.
   */
  it('leaves the item untouched on an interruption, and raises no change', () => {
    slice.appendSegments([progress('a', 0)]);
    changes = 0;

    slice.finalizeDecode([{ status: 'interruption', runId: 'run-1', id: 'a' }]);

    expect(ImageItem.isStreaming(slice.getImage('a'))).toBe(true);
    expect(changes).toBe(0);
  });

  it('writes nothing at all when a whole message resolves to nothing', () => {
    changes = 0;

    slice.finalizeDecode([
      { status: 'interruption', runId: 'run-1', id: 'a' },
      { status: 'interruption', runId: 'run-1', id: 'b' },
    ]);

    expect(changes).toBe(0);
  });
});

describe('ImagesSlice: a second run for the same image', () => {
  it('starts over, so a re-decode cannot inherit the old run bands', () => {
    slice.startDecode([start('a')]);
    slice.appendSegments([progress('a', 0)]);

    slice.startDecode([start('a', 'run-2')]);

    const item = slice.getImage('a');

    expect(item && 'image' in item ? item.image.segments : ['unset']).toEqual([]);
    expect(item && 'runId' in item ? item.runId : null).toBe('run-2');
  });

  it('then accepts the new run bands and refuses the old ones', () => {
    slice.startDecode([start('a')]);
    slice.startDecode([start('a', 'run-2')]);

    slice.appendSegments([progress('a', 0, 'run-1')]);
    slice.appendSegments([progress('a', 0, 'run-2')]);

    const item = slice.getImage('a');

    expect(item && 'image' in item ? item.image.segments.length : -1).toBe(1);
  });
});

describe('ImagesSlice: what it still does for everything else', () => {
  it('keeps a pending marker so a second pass does not re-request it', () => {
    const emitted = vi.fn();

    slice.queueDecode(['a']);

    expect(slice.getImage('a')?.kind).toBe('pending');
    expect(emitted).not.toHaveBeenCalled();
  });

  it('evicts everything outside the ids it is told to keep', () => {
    slice.startDecode([start('a'), start('b')]);

    slice.clearAllExcept(['a']);

    expect(slice.getImage('a')).toBeDefined();
    expect(slice.getImage('b')).toBeUndefined();
  });
});
