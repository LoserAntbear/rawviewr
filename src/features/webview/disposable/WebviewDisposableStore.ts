import type { WebviewDisposable } from './types';

export class WebviewDisposableStore implements WebviewDisposable {
  public get size(): number {
    return this.disposables.length;
  }

  private readonly disposables: WebviewDisposable[] = [];

  public add<T extends WebviewDisposable>(disposable: T): T {
    this.disposables.push(disposable);

    return disposable;
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables.length = 0;
  }
}
