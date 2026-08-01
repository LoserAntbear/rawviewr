import * as vscode from 'vscode';

import { RawEditorProvider } from './features/editor/RawEditorProvider';
import { ExtensionHost } from './features/extension/ExtensionHost';
import { VIEWER_REGISTRY } from './runtime/viewerRegistry';


export function activate(context: vscode.ExtensionContext): void {
  const provider = new RawEditorProvider(
    context,
    VIEWER_REGISTRY,
  );
  const host = new ExtensionHost(context, provider);

  host.register();
}

export function deactivate(): void {
  // Nothing to tear down: viewers are disposed by their own panels.
}
