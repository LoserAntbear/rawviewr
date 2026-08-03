import type { Viewer } from '@features/viewer/viewer';
import type * as vscode from 'vscode';

export interface ViewerRegistryEntry {
  viewer: Viewer;
  panel: vscode.WebviewPanel;
}
