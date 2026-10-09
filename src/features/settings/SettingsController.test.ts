import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_VIEWER_CONFIGURATION, ViewerBackground } from '@features/viewer/definitions';

import { ConfigChangeKind } from './VSCodeWorkspaceConfig/definitions';
import type { ConfigChangePayload } from './VSCodeWorkspaceConfig/types';
import { SettingsController } from './SettingsController';

/**
 * The two settings a view may follow while it is open. The key set already sorts them into
 * `ViewerWatched`; what is pinned here is that a listener hears only those, and hears the
 * whole configuration rather than having to work out which key moved.
 */

type Listener = (payload: ConfigChangePayload) => void;

function controllerWith(read: (key: string) => unknown) {
  let listener: Listener | undefined;

  const configController = {
    read,
    onDidChange: (listen: Listener) => {
      listener = listen;

      return { dispose: () => (listener = undefined) };
    },
  };

  return {
    fire: (payload: ConfigChangePayload) => listener?.(payload),
    settings: new SettingsController({} as never, configController as never),
  };
}

const configured = (key: string) => (key === 'defaultBackground' ? ViewerBackground.magenta : 320);

describe('SettingsController.readViewerConfiguration', () => {
  it('reads the tile size, which is the one key a view may follow while open', () => {
    const { settings } = controllerWith(configured);

    expect(settings.readViewerConfiguration()).toEqual({ tileSize: 320 });
  });

  it('falls back rather than leaving a view without a backdrop', () => {
    const { settings } = controllerWith(() => {
      throw new Error('workspace is gone');
    });

    expect(settings.readViewerConfiguration()).toEqual(DEFAULT_VIEWER_CONFIGURATION);
  });
});

describe('SettingsController.readDefaultBackground', () => {
  it('reads what a view should open with', () => {
    const { settings } = controllerWith(configured);

    expect(settings.readDefaultBackground()).toBe(ViewerBackground.magenta);
  });

  it('falls back to the checkerboard rather than leaving a view unpainted', () => {
    const { settings } = controllerWith(() => {
      throw new Error('workspace is gone');
    });

    expect(settings.readDefaultBackground()).toBe(ViewerBackground.checker);
  });
});

describe('SettingsController.onViewerConfigurationChange', () => {
  it('hands over the whole configuration when a watched key moves', () => {
    const listen = vi.fn();
    const { settings, fire } = controllerWith(configured);

    settings.onViewerConfigurationChange(listen);
    fire({ kind: ConfigChangeKind.ViewerWatched, keys: ['defaultBackground'] });

    expect(listen).toHaveBeenCalledWith({ tileSize: 320 });
  });

  it.each([
    [ConfigChangeKind.ViewerDefaults],
    [ConfigChangeKind.ViewerOnOpen],
  ])('says nothing for a %s change, which an open view cannot follow', (kind) => {
    const listen = vi.fn();
    const { settings, fire } = controllerWith(configured);

    settings.onViewerConfigurationChange(listen);
    fire({ kind, keys: ['defaultFormat'] });

    expect(listen).not.toHaveBeenCalled();
  });

  it('stops listening when the subscription is disposed', () => {
    const listen = vi.fn();
    const { settings, fire } = controllerWith(configured);

    settings.onViewerConfigurationChange(listen).dispose();
    fire({ kind: ConfigChangeKind.ViewerWatched, keys: ['defaultBackground'] });

    expect(listen).not.toHaveBeenCalled();
  });
});
