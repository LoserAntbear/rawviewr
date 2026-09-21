import * as vscode from 'vscode';

import { attemptDetached } from '@utils/attempt';

type InfoMessage =
  | { level: 'warn' | 'error'; message: string; }
  | { level: 'info'; message: string; items?: string[] };
export type InfoMessageLevel = InfoMessage['level'];

export class InfoMessageController {
  public static handleMessage(message: InfoMessage): void {
    switch (message.level) {
      case 'info':
        this.showInfo(message.message, message.items);
        break;
      case 'warn':
        this.showWarning(message.message);
        break;
      case 'error':
        this.showError(message.message);
        break;
    }
  }

  public static showInfo(message: string, items?: string[]): void {
    attemptDetached(
      () => vscode.window.showInformationMessage(message, ...(items ?? [])),
      (error) => console.error(`Failed to show info message: ${error}`),
    );
  }

  public static showWarning(message: string): void {
    attemptDetached(
      () => vscode.window.showWarningMessage(message),
      (error) => console.error(`Failed to show warning message: ${error}`),
    );
  }

  public static showError(message: string): void {
    attemptDetached(
      () => vscode.window.showErrorMessage(message),
      (error) => console.error(`Failed to show error message: ${error}`),
    );
  }
}
