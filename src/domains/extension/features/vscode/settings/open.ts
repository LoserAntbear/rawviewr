import * as vscode from 'vscode';

import { VSCodeCommands } from '@definitions/vscode';

export async function openSettings(query: string): Promise<void> {
  await vscode.commands.executeCommand(VSCodeCommands.OpenSettings, query);
}
