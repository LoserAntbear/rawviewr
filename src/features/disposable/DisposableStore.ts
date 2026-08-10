import * as vscode from 'vscode';

export abstract class DisposableStore implements vscode.Disposable {
  protected readonly disposables: vscode.Disposable[] = [];

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables.length = 0;
  }
}
