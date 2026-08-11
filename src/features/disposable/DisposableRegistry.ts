import * as vscode from 'vscode';

/**
 * Central owner for everything disposable in the extension. Bound to
 * `context.subscriptions` once in `activate`, so a single teardown reaches every
 * registered object regardless of who created it.
 *
 * A kind of a self-preservation attempt from shooting myself in the foot
 * with disposables which will hang around forever
 * if I forget to clean them up/add top a context subscription.
 */
export class DisposableRegistry implements vscode.Disposable {
  public get size(): number {
    return this.registered.size;
  }

  private readonly registered = new Set<vscode.Disposable>();
  private disposed = false;

  public register(disposable: vscode.Disposable): void {
    if (this.disposed) {
      // Registering into a torn-down registry would retain the object forever, since
      // nothing will dispose it later. Deferred by a microtask rather than disposed
      // inline: registration happens in the DisposableStore constructor, so the
      // subclass constructor has not run yet and `dispose()` would see undefined fields.
      queueMicrotask(() => disposable.dispose());

      return;
    }

    this.registered.add(disposable);
  }

  public unregister(disposable: vscode.Disposable): void {
    this.registered.delete(disposable);
  }

  /**
   * Disposes self and everything registered.
   * Called by VS Code when the extension is unloaded.
   */
  public dispose(): void {
    this.disposed = true;

    for (const disposable of [...this.registered]) {
      disposable.dispose();
    }

    this.registered.clear();
  }
}
