import * as vscode from 'vscode';

const SETTINGS_VSCODE_MEMENTO_PREFIX = 'rawImageViewer.settings:';

export class SettingsController {
  private get keys(): string[] {
    return this.workspaceState.keys().filter(
      (key) => key.startsWith(SETTINGS_VSCODE_MEMENTO_PREFIX),
    );
  }

  constructor(
    private readonly workspaceState: vscode.Memento,
  ) {}

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