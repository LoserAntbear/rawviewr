import type { WebviewDisposable } from './types';

export class WebviewDisposableStore implements WebviewDisposable {
  public get size(): number {
    return this.disposables.length;
  }

  private readonly disposables: WebviewDisposable[] = [];

  public add<T extends WebviewDisposable>(disposable: T): T;
  public add<T extends WebviewDisposable>(disposable: T[]): T[];
  public add<T extends WebviewDisposable>(disposable: T | T[]): T | T[] {
    return (Array.isArray(disposable))
      ? this.handleAddAsArray(disposable)
      : this.handleAddSingle(disposable);
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables.length = 0;
  }

  private handleAddAsArray<T extends WebviewDisposable>(disposables: T[]): T[] {
    for (const disposable of disposables) {
      this.disposables.push(disposable);
    }

    return disposables;
  }

  private handleAddSingle<T extends WebviewDisposable>(disposable: T): T {
    this.disposables.push(disposable);

    return disposable;
  }
}
