import type * as vscode from 'vscode';
import type { WebviewHost } from '@features/webview/webviewHost/WebviewHost';

export interface ViewerRegistryEntry {
  viewer: WebviewHost;
  panel: vscode.WebviewPanel;
}
