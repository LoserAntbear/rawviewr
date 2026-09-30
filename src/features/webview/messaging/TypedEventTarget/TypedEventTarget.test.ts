import { afterEach, describe, expect, it, vi } from 'vitest';

import { TypedEventTarget } from './TypedEventTarget';

type Events = { 'thing:change': { value: number } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TypedEventTarget', () => {
  it('hands each listener the detail it was emitted with', () => {
    const bus = new TypedEventTarget<Events>();
    const heard = vi.fn();

    bus.on('thing:change', (event) => heard(event.detail));
    bus.emit('thing:change', { value: 7 });

    expect(heard).toHaveBeenCalledWith({ value: 7 });
  });

  it('stops delivering once unsubscribed', () => {
    const bus = new TypedEventTarget<Events>();
    const heard = vi.fn();

    bus.on('thing:change', heard)();
    bus.emit('thing:change', { value: 7 });

    expect(heard).not.toHaveBeenCalled();
  });

  /**
   * The extension host of VS Code 1.85 runs Node 18, where `CustomEvent` is only a global
   * behind a flag. The bus carries its own event type so it works on both sides.
   */
  it('emits with no CustomEvent global in sight', () => {
    vi.stubGlobal('CustomEvent', undefined);

    const bus = new TypedEventTarget<Events>();
    const heard = vi.fn();

    bus.on('thing:change', (event) => heard(event.detail));

    expect(() => bus.emit('thing:change', { value: 7 })).not.toThrow();
    expect(heard).toHaveBeenCalledWith({ value: 7 });
  });
});
