import { describe, expect, it, vi } from 'vitest';

import { listenTo } from './listenTo';

describe('listenTo', () => {
  it('stops listening once disposed', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    const listener = listenTo(target, 'ping', handler);

    target.dispatchEvent(new Event('ping'));
    listener.dispose();
    target.dispatchEvent(new Event('ping'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('hands the same options to the removal, or the listener would outlive its disposal', () => {
    const target = new EventTarget();
    const handler = vi.fn();

    listenTo(target, 'ping', handler, { capture: true }).dispose();
    target.dispatchEvent(new Event('ping'));

    expect(handler).not.toHaveBeenCalled();
  });
});
