import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_VIEWER_CONFIGURATION, ViewerBackground } from '@features/viewer/definitions';

import { AlphaMode, DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { PixelFormatPresets } from '@features/image/format/presets';

import { ConfigChangeKind } from './VSCodeWorkspaceConfig/definitions';
import type { ConfigChangePayload } from './VSCodeWorkspaceConfig/types';
import { SettingsController } from './SettingsController';

/**
 * The two settings a view may follow while it is open. The key set already sorts them into
 * `ViewerWatched`; what is pinned here is that a listener hears only those, and hears the
 * whole configuration rather than having to work out which key moved.
 */

type Listener = (payload: ConfigChangePayload) => void;

function controllerWith(read: (key: string) => unknown, stored: Record<string, unknown> = {}) {
  let listener: Listener | undefined;

  const configController = {
    read,
    onDidChange: (listen: Listener) => {
      listener = listen;

      return { dispose: () => (listener = undefined) };
    },
  };

  const workspaceState = {
    keys: () => Object.keys(stored),
    get: (key: string) => stored[key],
    update: (key: string, value: unknown) => {
      stored[key] = value;

      return Promise.resolve();
    },
  };

  return {
    stored,
    fire: (payload: ConfigChangePayload) => listener?.(payload),
    settings: new SettingsController(workspaceState as never, configController as never),
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

/**
 * One toolbar for the window, kept so the next dump reads the way the last one did. It lives
 * in the workspace memento under the same prefix the reset command already sweeps.
 */
describe('SettingsController: the toolbar snapshot', () => {
  const snapshot = (preserved = true, width = 0) => ({
    preserved,
    options: { ...DEFAULT_DECODE_OPTIONS, width, height: width },
  });

  it('has nothing remembered to begin with', () => {
    expect(controllerWith(configured).settings.readToolbarSnapshot()).toBeNull();
  });

  it('keeps what it was given, and reads it back', async () => {
    const { settings } = controllerWith(configured);

    await settings.writeToolbarSnapshot(snapshot());

    expect(settings.readToolbarSnapshot()).toEqual(snapshot());
  });

  it('tells the views already open, not only the next one', async () => {
    const { settings } = controllerWith(configured);
    const heard = vi.fn();

    settings.onToolbarSnapshotChange(heard);
    await settings.writeToolbarSnapshot(snapshot());

    expect(heard).toHaveBeenCalledWith(snapshot());
  });

  it('stops telling a listener that let go', async () => {
    const { settings } = controllerWith(configured);
    const heard = vi.fn();

    settings.onToolbarSnapshotChange(heard).dispose();
    await settings.writeToolbarSnapshot(snapshot());

    expect(heard).not.toHaveBeenCalled();
  });
});

describe('SettingsController.readSessionDecodeOptions', () => {
  const remembered = (preserved: boolean, width: number) => ({
    preserved,
    options: {
      ...DEFAULT_DECODE_OPTIONS,
      width,
      height: width,
      format: PixelFormatPresets.getPreset('rgba8888'),
    },
  });

  it('opens on the remembered toolbar while it is being preserved', async () => {
    const { settings } = controllerWith(configured);

    await settings.writeToolbarSnapshot(remembered(true, 16));

    expect(settings.readSessionDecodeOptions(1024)).toMatchObject({ width: 16, height: 16 });
  });

  it('opens on the configured defaults when nothing is being preserved', async () => {
    // Every key answered in its own currency: a width that is a width, a format that is one.
    const { settings } = controllerWith((key) => (
      key === 'defaultFormat' ? 'rgb565'
        : key === 'defaultLittleEndian' ? true
          : key === 'defaultAlphaMode' ? AlphaMode.Use
            : 320
    ));

    await settings.writeToolbarSnapshot(remembered(false, 16));

    // `configured` answers 320 for every numeric key, defaults included.
    expect(settings.readSessionDecodeOptions(1024)).toMatchObject({ width: 320 });
  });

  it('drops a remembered size this buffer cannot hold, and keeps the rest', async () => {
    const { settings } = controllerWith(configured);

    await settings.writeToolbarSnapshot(remembered(true, 1920));

    expect(settings.readSessionDecodeOptions(1024)).toMatchObject({
      width: 0,
      height: 0,
      format: expect.objectContaining({ id: 'rgba8888' }),
    });
  });
});
