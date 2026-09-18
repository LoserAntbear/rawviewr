import { describe, expect, it, vi } from 'vitest';

import type { BufferItemData } from '@features/buffer';

import { RIVViewState } from '../RIVViewState';
import { RIVImageStateKind as Kind, RIVImageStateTransition as Transition } from './definitions';
import { INITIAL_IMAGE_STATE, RIV_IMAGE_STATE_HANDLERS } from './RivImageState';
import type { RIVImageState, RIVImageTransitionPayloads } from './types';

type FakeBitmap = ImageBitmap & { close: ReturnType<typeof vi.fn> };

function bitmap(width = 64, height = 32): FakeBitmap {
  return { width, height, close: vi.fn() } as unknown as FakeBitmap;
}

const item = (overrides: Partial<BufferItemData> = {}): BufferItemData => ({
  id: 'x',
  name: 'frame.raw',
  data: new ArrayBuffer(2048),
  ...overrides,
});

const machine = () => new RIVViewState<Kind, RIVImageState, RIVImageTransitionPayloads>(
  INITIAL_IMAGE_STATE,
  RIV_IMAGE_STATE_HANDLERS,
);

describe('riv-image state: Resolved decides the kind', () => {
  it.each([
    ['an errored item', item({ error: 'unreadable' }), null, Kind.Error],
    ['a stub still loading', item({ data: new ArrayBuffer(0) }), null, Kind.Loading],
    ['nothing decodable', item(), null, Kind.Empty],
  ])('%s', (_label, source, pixels, kind) => {
    expect(machine().updateState(Transition.Resolved, { item: source, bitmap: pixels }).kind).toBe(kind);
  });

  it('a decoded item is painted, with its geometry in the caption', () => {
    const state = machine().updateState(Transition.Resolved, { item: item(), bitmap: bitmap() });

    expect(state.kind).toBe(Kind.Painted);
    expect(state.caption.meta).toBe('64×32 · 2.0 KiB');
  });
});

describe('riv-image state: bitmap lifetime', () => {
  it('closes the outgoing bitmap when a new one replaces it', () => {
    const states = machine();
    const first = bitmap();

    states.updateState(Transition.Resolved, { item: item(), bitmap: first });
    states.updateState(Transition.Resolved, { item: item(), bitmap: bitmap() });

    expect(first.close).toHaveBeenCalledOnce();
  });

  it('keeps a bitmap that is committed again, since the canvas is still showing it', () => {
    const states = machine();
    const shown = bitmap();

    states.updateState(Transition.Resolved, { item: item(), bitmap: shown });
    states.updateState(Transition.Resolved, { item: item(), bitmap: shown });

    expect(shown.close).not.toHaveBeenCalled();
  });

  it('closes an incoming bitmap the resulting state has no use for', () => {
    const unused = bitmap();

    machine().updateState(Transition.Resolved, { item: item({ error: 'bad' }), bitmap: unused });

    expect(unused.close).toHaveBeenCalledOnce();
  });

  it('CloseBitmap closes what is painted, and leaves the state where it was', () => {
    const states = machine();
    const shown = bitmap();
    const painted = states.updateState(Transition.Resolved, { item: item(), bitmap: shown });

    expect(states.updateState(Transition.CloseBitmap, {})).toBe(painted);
    expect(shown.close).toHaveBeenCalledOnce();
  });
});

describe('riv-image state: Failed', () => {
  it('keeps the caption that was already on screen, and closes the bitmap', () => {
    const states = machine();
    const shown = bitmap();

    states.updateState(Transition.Resolved, { item: item(), bitmap: shown });

    const failed = states.updateState(Transition.Failed, { item: item(), error: new Error('canvas gone') });

    expect(failed.kind).toBe(Kind.Error);
    expect(failed.caption.meta).toBe('64×32 · 2.0 KiB');
    expect(shown.close).toHaveBeenCalledOnce();
  });

  it('takes the item\'s caption when nothing was on screen yet', () => {
    const failed = machine().updateState(Transition.Failed, { item: item({ name: 'n.raw' }), error: 'boom' });

    expect(failed.caption.name).toBe('n.raw');
  });
});
