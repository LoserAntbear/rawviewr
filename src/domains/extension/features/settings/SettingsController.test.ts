import { describe, expect, it, vi } from 'vitest';

import { PixelFormatPresets } from '@SHARED/features/image/format/presets';
import { AlphaMode, DEFAULT_DECODE_OPTIONS } from '@SHARED/features/image/imageDecoder/definitions';
import { ConfigChangeKind } from '@SHARED/features/settings/configuration/definitions';
import type { ConfigChangePayload } from '@SHARED/features/settings/configuration/types';
import { toPreservedOptions } from '@SHARED/features/settings/snapshot';
import { DEFAULT_VIEWER_CONFIGURATION, ViewerBackground } from '@SHARED/features/viewer/definitions';

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
  const snapshot = (preserved = true) => ({
    preserved,
    options: toPreservedOptions(DEFAULT_DECODE_OPTIONS),
  });

  it('has nothing remembered to begin with', () => {
    expect(controllerWith(configured).settings.toolbarSnapshot).toBeNull();
  });

  it('keeps what it was given, and reads it back', async () => {
    const { settings } = controllerWith(configured);

    await settings.writeToolbarSnapshot(snapshot());

    expect(settings.toolbarSnapshot).toEqual(snapshot());
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

/** Every key answered in its own currency: a width that is a width, a format that is one. */
const defaults = (key: string) => (
  key === 'defaultFormat' ? 'rgb565'
    : key === 'defaultLittleEndian' ? true
      : key === 'defaultAlphaMode' ? AlphaMode.Use
        : 320
);

describe('SettingsController.readSessionDecodeOptions', () => {
  const remembered = (preserved: boolean, formatId = 'rgba8888') => ({
    preserved,
    options: toPreservedOptions({
      ...DEFAULT_DECODE_OPTIONS,
      flipY: true,
      format: PixelFormatPresets.getPreset(formatId),
    }),
  });

  it('opens on the remembered toolbar while it is being preserved', async () => {
    const { settings } = controllerWith(configured);

    await settings.writeToolbarSnapshot(remembered(true));

    expect(settings.readSessionDecodeOptions()).toMatchObject({
      flipY: true,
      format: expect.objectContaining({ id: 'rgba8888' }),
    });
  });

  it('opens on the configured defaults when nothing is being preserved', async () => {
    const { settings } = controllerWith(defaults);

    await settings.writeToolbarSnapshot(remembered(false));

    expect(settings.readSessionDecodeOptions()).toMatchObject({
      flipY: false,
      format: expect.objectContaining({ id: 'rgb565' }),
    });
  });

  /** A kept toolbar says nothing about geometry, so each buffer still gets its own. */
  it('leaves the geometry to the file, however it was opened', async () => {
    const { settings } = controllerWith(defaults);

    await settings.writeToolbarSnapshot(remembered(true));

    expect(settings.readSessionDecodeOptions()).toMatchObject({ width: 320, height: 320, offset: 320 });
  });
});

describe('SettingsController.clearToolbarSnapshot', () => {
  it('lets the kept toolbar go, so the next launch opens on the defaults', async () => {
    const { settings } = controllerWith(configured);

    await settings.writeToolbarSnapshot({ preserved: true, options: toPreservedOptions(DEFAULT_DECODE_OPTIONS) });
    await settings.clearToolbarSnapshot();

    expect(settings.toolbarSnapshot).toBeNull();
  });

  it('says nothing to anyone, since this runs when no view is left to hear it', async () => {
    const { settings } = controllerWith(configured);
    const heard = vi.fn();

    settings.onToolbarSnapshotChange(heard);
    await settings.clearToolbarSnapshot();

    expect(heard).not.toHaveBeenCalled();
  });
});
