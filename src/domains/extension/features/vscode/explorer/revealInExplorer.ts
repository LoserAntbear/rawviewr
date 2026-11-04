import * as vscode from 'vscode';

import { VSCodeCommands } from '@definitions/vscode';

export async function revealInExplorer(target: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand(VSCodeCommands.RevealInExplorer, target);
}
