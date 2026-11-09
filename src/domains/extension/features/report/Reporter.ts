import * as vscode from 'vscode';

import { DisposableStore } from '@EXTENSION/features/disposable/DisposableStore';
import { InfoMessageController } from '@EXTENSION/features/infoMessage/InfoMessageController';
import type { CommonReporter } from '@SHARED/types';

/**
 * A basic output into VS Code's output channel with error reporting.
 */
export class Reporter extends DisposableStore implements CommonReporter {
  constructor(
    private readonly prefix: string,
    private readonly channel: vscode.OutputChannel = vscode.window.createOutputChannel(prefix),
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

  private formatMessage(message: string): string {
    return `${this.prefix}: ${message}`;
  }
}
