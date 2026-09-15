import * as vscode from 'vscode';
import { VSCodeWorkspaceConfigurationController } from './VSCodeWorkspaceConfig/VScodeWorkspaceConfigurationController';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';
import { DecodeOptions } from '@features/image/imageDecoder/types';
import { Endian } from '@definitions/bits';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';

const VSCODE_MEMENTO_SETTINGS_PREFIX = 'rawImageViewer.settings:';

export class SettingsController {
  private get keys(): string[] {
    return this.workspaceState.keys().filter(
      (key) => key.startsWith(VSCODE_MEMENTO_SETTINGS_PREFIX),
    );
  }

  constructor(
    private readonly workspaceState: vscode.Memento,
    private readonly configController: VSCodeWorkspaceConfigurationController,
  ) {}

  public readDefaultDecodeOptions(): DecodeOptions {
    try {
      return {
          ...DEFAULT_DECODE_OPTIONS,
        format: this.configController.read('defaultFormat'),
        width: this.configController.read('defaultWidth'),
        height: this.configController.read('defaultHeight'),
        offset: this.configController.read('defaultOffset'),
        alphaMode: this.configController.read('defaultAlphaMode'),
        endian: this.configController.read('defaultLittleEndian') ? Endian.Little : Endian.Big,
      }
    } catch (error) {
      InfoMessageController.showError(
        `Raw Image Viewer: failed to read default settings. ${error instanceof Error ? error.message : String(error)}`,
      );

      return DEFAULT_DECODE_OPTIONS;
    }
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
