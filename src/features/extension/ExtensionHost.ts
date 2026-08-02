import * as vscode from 'vscode';
import { CommandDescriptor } from './types';
import * as COMMAND_HANDLERS from './commands/handlers/handlers';
import { CommandNames } from '../../definitions/commands';
import type { RawEditorProvider } from '../editor/RawEditorProvider.js';
import { ViewType } from '../../definitions/viewTypes';
import { ViewerWindowController } from '../viewer/windowController/ViewerWindowController';

const EDITOR_OPTIONS = {
  webviewOptions: { retainContextWhenHidden: true },
  supportsMultipleEditorsPerDocument: true,
};

export class ExtensionHost {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly provider: RawEditorProvider,
    public readonly viewerWindowController: ViewerWindowController,
  ) {}

  public register(): void {
    this.context.subscriptions.push(
      ...this.registerCustomEditorProviders(),
      ...this.registerCommands([
        {
          name: CommandNames.open,
          action: COMMAND_HANDLERS.handleOpen,
        },
        {
          name: CommandNames.openGallery,
          action: COMMAND_HANDLERS.handleOpenGallery,
        },
        {
          name: CommandNames.openFolderGallery,
          action: COMMAND_HANDLERS.handleOpenFolderGallery,
        },
        {
          name: CommandNames.exportFile,
          action: COMMAND_HANDLERS.handleExport,
        },
        {
          name: CommandNames.resetSettings,
          action: () => COMMAND_HANDLERS.handleResetSettings(this.context.workspaceState),
        },
      ]),
    );
  }

  private registerCustomEditorProviders(): vscode.Disposable[] {
    return [
      vscode.window.registerCustomEditorProvider(ViewType.Single, this.provider, EDITOR_OPTIONS),
      vscode.window.registerCustomEditorProvider(ViewType.Optional, this.provider, EDITOR_OPTIONS),
    ];
  }

  private registerCommands(commands: CommandDescriptor[]): vscode.Disposable[] {
    return commands.map(({ name, action }) => {
      try {
        return vscode.commands.registerCommand(name, action);
      } catch (error) {
        console.error(`Failed to register command ${name}:`, error);

        return { dispose: () => {} } as vscode.Disposable;
      }
    });
  }
}