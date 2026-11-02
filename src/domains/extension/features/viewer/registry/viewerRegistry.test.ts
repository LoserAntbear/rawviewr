import { describe, expect, it, vi } from 'vitest';

import type { WebviewHost } from '@EXTENSION/features/webviewHost/WebviewHost';

import { ViewerRegistry } from './viewerRegistry';

/**
 * The registry holds the viewers that are open and lets each go when its panel does. A closed
 * panel is the only lifecycle signal it acts on — nothing else hangs off a view going away, so
 * a preserved toolbar outlives all of them.
 */

function panelWith(active = false) {
  let dispose = () => undefined as void;

  return {
    close: () => dispose(),
    viewer: { dispose: vi.fn() } as unknown as WebviewHost,
    panel: {
      active,
      onDidDispose: (listen: () => void) => {
        dispose = listen;

        return { dispose: () => undefined };
      },
    } as never,
  };
}

describe('ViewerRegistry', () => {
  it('disposes the viewer whose panel went away', () => {
    const registry = new ViewerRegistry();
    const only = panelWith();

    registry.register(only);
    only.close();

    expect(only.viewer.dispose).toHaveBeenCalledOnce();
  });

  it('stops offering a closed viewer as the active one', () => {
    const registry = new ViewerRegistry();
    const only = panelWith(true);

    registry.register(only);

    expect(registry.activeViewer).toBe(only.viewer);

    only.close();

    expect(registry.activeViewer).toBeUndefined();
  });

  it('leaves a viewer that is still open alone', () => {
    const registry = new ViewerRegistry();
    const first = panelWith();
    const second = panelWith(true);

    registry.register(first);
    registry.register(second);
    first.close();

    expect(second.viewer.dispose).not.toHaveBeenCalled();
    expect(registry.activeViewer).toBe(second.viewer);
  });
});
