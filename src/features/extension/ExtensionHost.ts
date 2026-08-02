import * as vscode from 'vscode';

import type { IntentParserResult } from '@features/intent/types';
import { ViewType } from '@definitions/viewTypes';
import type { RawEditorProvider } from '@features/editor/RawEditorProvider';
import type { IntentDispatcher } from '@features/intent/IntentDispatcher';
import { COMMANDS } from '@features/extension/commands/table';
import type { IntentCommand } from '@features/extension/commands/types';

const EDITOR_OPTIONS = {
  webviewOptions: { retainContextWhenHidden: true },
  supportsMultipleEditorsPerDocument: true,
};

export class ExtensionHost {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly provider: RawEditorProvider,
    private readonly dispatcher: IntentDispatcher,
  ) {}

  public register(): void {
    this.context.subscriptions.push(
      ...this.registerCustomEditorProviders(),
      ...this.registerCommands(COMMANDS),
    );
  }

  private registerCustomEditorProviders(): vscode.Disposable[] {
    return [
      vscode.window.registerCustomEditorProvider(ViewType.Single, this.provider, EDITOR_OPTIONS),
      vscode.window.registerCustomEditorProvider(ViewType.Optional, this.provider, EDITOR_OPTIONS),
    ];
  }

  private registerCommands(commands: readonly IntentCommand[]): vscode.Disposable[] {
    return commands.map(({ name, parseToIntent }) => {
      try {
        /**
         * On command regisstration we wrap the actual command to propagate intent parser.
         * Since VScode commands can be envoked from multiple sources (command palette, keybindings, context menus, etc.)
         * The actual arguments passed to command callback can differ.
         *
         * We expect intentParser to handle the arguments and return a valid intent object or undefined if the arguments are invalid.
         */
        return vscode.commands.registerCommand(name, (...args: unknown[]) =>
          this.tryDispatchIntent(name, parseToIntent(...args)),
        );
      } catch (error) {
        console.error(`Failed to register command ${name}:`, error);

        return { dispose: () => {} } as vscode.Disposable;
      }
    });
  }

  private async tryDispatchIntent(name: string, intent: IntentParserResult): Promise<void> {
    if (!intent) {
      console.warn(`[rawImageViewer] ${name}: ignored malformed invocation. Wrong or missing extension intent.`);

      return;
    }

    try {
      await this.dispatcher.dispatch(intent);
    } catch (error) {
      void vscode.window.showErrorMessage(`Raw Image Viewer: Command ${name} failed — ${error}`);

      throw error;
    }
  }
}
