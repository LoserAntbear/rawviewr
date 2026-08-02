import * as vscode from 'vscode';

import { RawEditorProvider } from './features/editor/RawEditorProvider';
import { ExtensionHost } from './features/extension/ExtensionHost';
import { ViewerWindowController } from './features/viewer/windowController/ViewerWindowController';
import { ViewerRegistry } from './features/viewer/registry/viewerRegistry';


export function activate(context: vscode.ExtensionContext): void {
  const registry = new ViewerRegistry();
  const provider = new RawEditorProvider(
    context,
    registry,
  );
  const host = new ExtensionHost(
    context,
    provider,
    new ViewerWindowController(context, registry),
  );

  host.register();
}

export function deactivate(): void {
  // Nothing to tear down: viewers are disposed by their own panels.
}
