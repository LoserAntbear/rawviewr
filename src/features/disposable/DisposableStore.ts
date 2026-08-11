import * as vscode from 'vscode';

import type { DisposableRegistry } from './DisposableRegistry';

export abstract class DisposableStore implements vscode.Disposable {
  private static get registry(): DisposableRegistry | null {
    if (!DisposableStore._registry) {
      // TODO: Add logger?
      console.error(new Error('No registry assigned. Call DisposableStore.assignRegistry() before constructing any store.'));
    }

    return this._registry;
  }

  private static set registry(registry: DisposableRegistry | null) {
    if (DisposableStore._registry && registry) {
      console.error(new Error('Registry already assigned. Call DisposableStore.assignRegistry(null) before assigning a new one.'));
    }

    this._registry = registry;
  }

  private static _registry: DisposableRegistry | null = null;

  /**
   * Binds a registry for self-registration of stores.
   * Must be called before any store is constructed, and only once.
   */
  public static assignRegistry(registry: DisposableRegistry | null): void {
    DisposableStore._registry = registry;
  }

  protected readonly disposables: vscode.Disposable[] = [];

  constructor() {
    // The registry only stores the reference — it must not touch `this`, because the
    // subclass constructor has not run yet and the instance is still half-built.
    DisposableStore.registry?.register(this);
  }

  public dispose(): void {
    // Unregister first: a store disposed by its own parent must not linger in the
    // registry until the extension shuts down.
    DisposableStore.registry?.unregister(this);

    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables.length = 0;
  }
}
