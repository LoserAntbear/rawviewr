import type { Viewer } from '../../../viewer.js';
import type * as vscode from 'vscode';

export interface ViewerRegistryEntry {
  viewer: Viewer;
  panel: vscode.WebviewPanel;
}
