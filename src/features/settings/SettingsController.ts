import * as vscode from 'vscode';
import { VSCodeWorkspaceConfigurationController } from './VSCodeWorkspaceConfig/VScodeWorkspaceConfigurationController';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { DecodeOptions } from '@features/image/imageDecoder/types';
import { PixelFormatPresets } from '@features/image/format/presets';
import { Endian } from '@definitions/bits';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';
import { attempt } from '@utils/attempt';
import { ConfigChangeKind } from './VSCodeWorkspaceConfig/definitions';
import { DEFAULT_VIEWER_BACKGROUND, DEFAULT_VIEWER_CONFIGURATION } from '@features/viewer/definitions';
import type { ViewerBackground } from '@features/viewer/definitions';
import type { ViewerConfiguration } from './VSCodeWorkspaceConfig/types';
import { DisposableStore } from '@features/disposable/DisposableStore';
import type { ToolbarOptionsSnapshot } from './snapshot';

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
