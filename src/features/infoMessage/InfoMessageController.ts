import * as vscode from 'vscode';

type InfoMessage =
  | { level: 'warn' | 'error'; message: string; }
  | { level: 'info'; message: string; items?: string[] };
export type InfoMessageLevel = InfoMessage['level'];

export class InfoMessageController {
  public static async handleMessage(message: InfoMessage): Promise<void> {
    switch (message.level) {
      case 'info':
        await this.showInfo(message.message, message.items);
        break;
      case 'warn':
        await this.showWarning(message.message);
        break;
      case 'error':
        await this.showError(message.message);
        break;
    }
  }

  public static async showInfo(message: string, items?: string[]): Promise<void> {
    try {
      return await vscode.window.showInformationMessage(message, ...(items ?? [])).then(() => {});
    } catch (error) {
      console.error(`Failed to show info message: ${error}`);
    }
  }

  public static async showWarning(message: string): Promise<void> {
    try {
      return await vscode.window.showWarningMessage(message).then(() => {});
    } catch (error) {
      console.error(`Failed to show warning message: ${error}`);
    }
  }

  public static async showError(message: string): Promise<void> {
    try {
      return await vscode.window.showErrorMessage(message).then(() => {});
    } catch (error) {
      console.error(`Failed to show error message: ${error}`);
    }
  }
}
