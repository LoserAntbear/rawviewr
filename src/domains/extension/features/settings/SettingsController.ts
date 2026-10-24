import * as vscode from 'vscode';

import { Endian } from '@definitions/bits';
import { DisposableStore } from '@EXTENSION/features/disposable/DisposableStore';
import { InfoMessageController } from '@EXTENSION/features/infoMessage/InfoMessageController';
import { PixelFormatPresets } from '@SHARED/features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@SHARED/features/image/imageDecoder/definitions';
import type { DecodeOptions } from '@SHARED/features/image/imageDecoder/types';
import { ConfigChangeKind } from '@SHARED/features/settings/configuration/definitions';
import type { ViewerConfiguration } from '@SHARED/features/settings/configuration/types';
import type { ToolbarOptionsSnapshot } from '@SHARED/features/settings/snapshot';
import type { ViewerBackground } from '@SHARED/features/viewer/definitions';
import { DEFAULT_VIEWER_BACKGROUND, DEFAULT_VIEWER_CONFIGURATION } from '@SHARED/features/viewer/definitions';
import { attempt } from '@utils/attempt';

import type { VSCodeWorkspaceConfigurationController } from './VSCodeWorkspaceConfig/VScodeWorkspaceConfigurationController';

const VSCODE_MEMENTO_SETTINGS_PREFIX = 'rawImageViewer.settings:';
const TOOLBAR_SNAPSHOT_KEY = `${VSCODE_MEMENTO_SETTINGS_PREFIX}toolbarSnapshot`;

export class SettingsController extends DisposableStore {
  public get toolbarSnapshot(): ToolbarOptionsSnapshot | null {
    return this.workspaceState.get<ToolbarOptionsSnapshot>(TOOLBAR_SNAPSHOT_KEY) ?? null;
  }

  private get keys(): string[] {
    return this.workspaceState.keys().filter(
      (key) => key.startsWith(VSCODE_MEMENTO_SETTINGS_PREFIX),
    );
  }

  constructor(
    private readonly workspaceState: vscode.Memento,
    private readonly configController: VSCodeWorkspaceConfigurationController,
    private readonly snapshotEmitter: vscode.EventEmitter<ToolbarOptionsSnapshot> =
    new vscode.EventEmitter<ToolbarOptionsSnapshot>(),
  ) {
    super();

    this.disposables.push(this.snapshotEmitter);
  }

  public async writeToolbarSnapshot(snapshot: ToolbarOptionsSnapshot): Promise<void> {
    await this.workspaceState.update(TOOLBAR_SNAPSHOT_KEY, snapshot);

    this.snapshotEmitter.fire(snapshot);
  }

  public async clearToolbarSnapshot(): Promise<void> {
    await this.workspaceState.update(TOOLBAR_SNAPSHOT_KEY, undefined);
  }

  public onToolbarSnapshotChange(listen: (snapshot: ToolbarOptionsSnapshot) => void): vscode.Disposable {
    return this.snapshotEmitter.event(listen);
  }

  public readSessionDecodeOptions(): DecodeOptions {
    const snapshot = this.toolbarSnapshot;

    return {
      ...this.readDefaultDecodeOptions(),
      ...(snapshot?.preserved ? snapshot.options : {}),
    };
  }

  public readDefaultDecodeOptions(): DecodeOptions {
    try {
      return {
        ...DEFAULT_DECODE_OPTIONS,
        width: this.configController.read('defaultWidth'),
        height: this.configController.read('defaultHeight'),
        offset: this.configController.read('defaultOffset'),
        alphaMode: this.configController.read('defaultAlphaMode'),
        format: PixelFormatPresets.getPreset(this.configController.read('defaultFormat')),
        endian: this.configController.read('defaultLittleEndian') ? Endian.Little : Endian.Big,
      }
    } catch (error) {
      InfoMessageController.showError(
        `Raw Image Viewer: failed to read default settings. ${error instanceof Error ? error.message : String(error)}`,
      );

      return DEFAULT_DECODE_OPTIONS;
    }
  }

  public readViewerConfiguration(): ViewerConfiguration {
    return attempt(
      () => ({ tileSize: this.configController.read('tileSize') }),
      (error) => {
        InfoMessageController.showError(
          `Raw Image Viewer: failed to read viewer settings. ${error instanceof Error ? error.message : String(error)}`,
        );

        return DEFAULT_VIEWER_CONFIGURATION;
      },
    );
  }

  public readDefaultBackground(): ViewerBackground {
    return attempt(
      () => this.configController.read('defaultBackground'),
      () => DEFAULT_VIEWER_BACKGROUND,
    );
  }

  public onViewerConfigurationChange(listen: (config: ViewerConfiguration) => void): vscode.Disposable {
    return this.configController.onDidChange(({ kind }) => {
      if (kind === ConfigChangeKind.ViewerWatched) {
        listen(this.readViewerConfiguration());
      }
    });
  }

  public async resetSettings(): Promise<void> {
    try {
      const keys = this.keys;

      for (const key of keys) {
        await this.workspaceState.update(key, undefined);
      }

      await vscode.window.showInformationMessage(
        `Raw Image Viewer: cleared decode settings for ${keys.length} buffer(s). Reopen any view to pick up the defaults.`,
      );
    } catch (error) {
      await vscode.window.showErrorMessage(
        `Raw Image Viewer: failed to reset settings. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
