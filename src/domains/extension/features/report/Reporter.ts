import * as vscode from 'vscode';

import { DisposableStore } from '@EXTENSION/features/disposable/DisposableStore';
import { InfoMessageController } from '@EXTENSION/features/infoMessage/InfoMessageController';

import type { Remedy, Report } from './types';

// A basic output into VS Code's output channel with error reporting.
export class Reporter extends DisposableStore implements Report {
  constructor(
    private readonly name: string,
    private readonly channel: vscode.OutputChannel = vscode.window.createOutputChannel(name),
  ) {
    super();

    this.disposables.push(this.channel);
  }

  public log(...lines: readonly string[]): void {
    for (const line of lines) {
      this.channel.appendLine(line);
    }
  }

  public show(): void {
    this.channel.show(true);
  }

  public failed(reason: string): void {
    this.log(`failed: ${reason}`);

    InfoMessageController.showError(this.formatMessage(reason));
  }
  public async unavailable(message: string, remedy: Remedy): Promise<void> {
    this.log(`unavailable: ${message}`);

    const chosen = await vscode.window.showErrorMessage(this.formatMessage(message), remedy.label);

    if (chosen === remedy.label) {
      await remedy.apply();
    }
  }

  private formatMessage(message: string): string {
    return `${this.name}: ${message}`;
  }
}
