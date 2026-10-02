import { describe, expect, it, vi } from 'vitest';
import { window } from 'vscode';

import { IntentKind } from '@definitions/intent';
import type { WebviewHost } from '@features/webview/webviewHost/WebviewHost';

import type { ViewerRegistry } from './registry/viewerRegistry';
import { VIEW_INTENT_RESOLVERS } from './resolvers';

/**
 * A zoom chord arrives at the extension, which has to decide *which* view it meant. That is
 * the active one, and nothing else about the keystroke matters here.
 */

function resolverFor(activeViewer: Partial<WebviewHost> | undefined) {
  const registry = { activeViewer } as ViewerRegistry;

  return VIEW_INTENT_RESOLVERS(registry)[IntentKind.viewZoom];
}

describe('VIEW_INTENT_RESOLVERS: view/zoom', () => {
  it('asks the active view to zoom the way the command said', async () => {
    const requestZoom = vi.fn(async () => undefined);

    await resolverFor({ requestZoom })({ kind: IntentKind.viewZoom, direction: 'out' });

    expect(requestZoom).toHaveBeenCalledWith('out');
  });

  it('does nothing, and says nothing, when no view is focused', async () => {
    await expect(resolverFor(undefined)({ kind: IntentKind.viewZoom, direction: 'in' })).resolves.toBeUndefined();

    // A keystroke that pops a message box is worse than one that does nothing.
    expect(window.showErrorMessage).not.toHaveBeenCalled();
  });

  it('reports a view that could not be reached, rather than leaving a rejection loose', async () => {
    const requestZoom = vi.fn(() => Promise.reject(new Error('webview is gone')));

    await resolverFor({ requestZoom })({ kind: IntentKind.viewZoom, direction: 'in' });

    expect(window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to zoom the view: webview is gone',
    );
  });
});
