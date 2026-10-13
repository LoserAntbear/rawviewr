import { describe, expect, it, vi } from 'vitest';

import type { WebviewHost } from '@features/webview/webviewHost/WebviewHost';

import { ViewerRegistry } from './viewerRegistry';

/**
 * The registry is what knows when nothing is open any more. What should be let go of then —
 * a preserved toolbar, say — is decided where the extension is composed.
 */

function panelWith() {
  let dispose = () => undefined as void;

  return {
    close: () => dispose(),
    panel: {
      active: false,
      onDidDispose: (listen: () => void) => {
        dispose = listen;

        return { dispose: () => undefined };
      },
    } as never,
  };
}

const viewer = () => ({ dispose: vi.fn() } as unknown as WebviewHost);

describe('ViewerRegistry.onEmpty', () => {
  it('says so when the last viewer closes', () => {
    const registry = new ViewerRegistry();
    const emptied = vi.fn();
    const only = panelWith();

    registry.register({ panel: only.panel, viewer: viewer() });
    registry.onEmpty(emptied);
    only.close();

    expect(emptied).toHaveBeenCalledOnce();
  });

  it('stays quiet while any viewer is left', () => {
    const registry = new ViewerRegistry();
    const emptied = vi.fn();
    const first = panelWith();
    const second = panelWith();

    registry.register({ panel: first.panel, viewer: viewer() });
    registry.register({ panel: second.panel, viewer: viewer() });
    registry.onEmpty(emptied);
    first.close();

    expect(emptied).not.toHaveBeenCalled();
  });

  it('says so once the second of two closes as well', () => {
    const registry = new ViewerRegistry();
    const emptied = vi.fn();
    const first = panelWith();
    const second = panelWith();

    registry.register({ panel: first.panel, viewer: viewer() });
    registry.register({ panel: second.panel, viewer: viewer() });
    registry.onEmpty(emptied);
    first.close();
    second.close();

    expect(emptied).toHaveBeenCalledOnce();
  });

  it('still disposes the viewer it dropped', () => {
    const registry = new ViewerRegistry();
    const only = panelWith();
    const host = viewer();

    registry.register({ panel: only.panel, viewer: host });
    only.close();

    expect(host.dispose).toHaveBeenCalledOnce();
  });

  it('stops telling a listener that let go', () => {
    const registry = new ViewerRegistry();
    const emptied = vi.fn();
    const only = panelWith();

    registry.register({ panel: only.panel, viewer: viewer() });
    registry.onEmpty(emptied).dispose();
    only.close();

    expect(emptied).not.toHaveBeenCalled();
  });
});
