import type { Viewer } from '@root/viewer';
import type * as vscode from 'vscode';

export interface ViewerRegistryEntry {
  viewer: Viewer;
  panel: vscode.WebviewPanel;
}
