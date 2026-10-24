import type * as vscode from 'vscode';

import type { WebviewHost } from '@EXTENSION/features/webviewHost/WebviewHost';

export type ViewerRegistryEntry = {
  viewer: WebviewHost;
  panel: vscode.WebviewPanel;
}
