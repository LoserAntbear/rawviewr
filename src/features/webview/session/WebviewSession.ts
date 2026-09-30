import { WebviewDisposableStore } from '../disposable/WebviewDisposableStore';
import type { WebviewDisposable } from '../disposable/types';

/**
 * Holds the listeners a session runs on, and lets them all go at once. What they are is
 * decided where the session is built.
 */
export class WebviewSession implements WebviewDisposable {
  private readonly disposableStore = new WebviewDisposableStore();

  constructor(listeners: readonly WebviewDisposable[]) {
    this.disposableStore.add([...listeners]);
  }

  public dispose(): void {
    this.disposableStore.dispose();
  }
}
