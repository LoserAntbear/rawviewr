import type { Viewer } from '@features/viewer/viewer';
import { ViewerRegistryEntry } from './types';

export class ViewerRegistry {
  public get activeViewer(): Viewer | undefined {
    for (const entry of this._registry) {
      if (entry.panel.active) {
        return entry.viewer;
      }
    }

    return undefined;
  }

  private readonly _registry: Set<ViewerRegistryEntry> = new Set();

  public register(entry: ViewerRegistryEntry): void {
    this._registry.add(entry);
    this.subscribeToPanelDisposal(entry);
  }

  private subscribeToPanelDisposal(entry: ViewerRegistryEntry): void {
    entry.panel.onDidDispose(() => {
      this._registry.delete(entry);
      entry.viewer.dispose();
    });
  }
}
