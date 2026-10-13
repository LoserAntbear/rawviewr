import type * as vscode from 'vscode';

import type { WebviewHost } from '@features/webview/webviewHost/WebviewHost';

import type { ViewerRegistryEntry } from './types';

export class ViewerRegistry {
  public get activeViewer(): WebviewHost | undefined {
    for (const entry of this._registry) {
      if (entry.panel.active) {
        return entry.viewer;
      }
    }

    return undefined;
  }

  private readonly _registry: Set<ViewerRegistryEntry> = new Set();
  private readonly emptyListeners = new Set<() => void>();

  public onEmpty(listen: () => void): vscode.Disposable {
    this.emptyListeners.add(listen);

    return { dispose: () => this.emptyListeners.delete(listen) };
  }

  public register(entry: ViewerRegistryEntry): void {
    this._registry.add(entry);
    this.subscribeToPanelDisposal(entry);
  }

  private notifyEmpty(): void {
    for (const listen of [...this.emptyListeners]) {
      listen();
    }
  }

  private subscribeToPanelDisposal(entry: ViewerRegistryEntry): void {
    entry.panel.onDidDispose(() => {
      this._registry.delete(entry);
      entry.viewer.dispose();

      if (this._registry.size === 0) {
        this.notifyEmpty();
      }
    });
  }
}
