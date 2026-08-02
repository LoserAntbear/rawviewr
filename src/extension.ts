import * as vscode from 'vscode';

import { RawEditorProvider } from './features/editor/RawEditorProvider';
import { ExtensionHost } from './features/extension/ExtensionHost';
import { IntentDispatcher } from './features/intent/IntentDispatcher';
import { settingsResolvers } from './features/settings/resolvers';
import { ViewerRegistry } from './features/viewer/registry/viewerRegistry';
import { viewerIntentResolvers } from './features/viewer/resolvers';
import { ViewerWindowController } from './features/viewer/windowController/ViewerWindowController';

export function activate(context: vscode.ExtensionContext): void {
  const registry = new ViewerRegistry();
  const windowController = new ViewerWindowController(context, registry);

  const dispatcher = new IntentDispatcher({
    ...viewerIntentResolvers(windowController, registry),
    ...settingsResolvers(context.workspaceState),
  });
  const host = new ExtensionHost(context, new RawEditorProvider(context, registry), dispatcher);

  host.register();
}

export function deactivate(): void {
  // Nothing to tear down: viewers are disposed by their own panels.
}
