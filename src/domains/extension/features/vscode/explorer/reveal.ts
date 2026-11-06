import * as vscode from 'vscode';

import { VSCodeCommands } from '@definitions/vscode';

export async function revealInOS(target: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand(VSCodeCommands.RevealFileInOS, target);
}

export async function revealInExplorer(target: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand(VSCodeCommands.RevealInExplorer, target);
}
