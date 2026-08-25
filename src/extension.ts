import * as vscode from 'vscode';

import { DisposableRegistry } from '@features/disposable/DisposableRegistry';
import { DisposableStore } from '@features/disposable/DisposableStore';
import { RawEditorProvider } from '@features/editor/RawEditorProvider';
import { ExtensionHost } from '@features/extension/ExtensionHost';
import { IntentDispatcher } from '@features/intent/IntentDispatcher';
import { SETTINGS_INTENT_RESOLVERS } from '@features/settings/resolvers';
import { ViewerRegistry } from '@features/viewer/registry/viewerRegistry';
import { VIEWER_INTENT_RESOLVERS } from '@features/viewer/resolvers';
import { ViewerWindowController } from '@features/viewer/windowController/ViewerWindowController';
import { SettingsController } from '@features/settings/SettingsController';
import { VSCodeWorkspaceConfigurationController } from '@features/settings/VSCodeWorkspaceConfig/VScodeWorkspaceConfigurationController';
import { AppContextProvider } from '@features/appContext/AppContextProvider';

export function activate(context: vscode.ExtensionContext): void {
  // DISCLAIMER: Must be created before any DisposableStore, so that the latter can self-register into it.
  const disposableRegistry = new DisposableRegistry();

  DisposableStore.assignRegistry(disposableRegistry);
  context.subscriptions.push(disposableRegistry);

  const viewerRegistry = new ViewerRegistry();
  const windowController = new ViewerWindowController(context, viewerRegistry);
  const configController = new VSCodeWorkspaceConfigurationController(
    new vscode.EventEmitter(),
  );
  const settingsController = new SettingsController(context.workspaceState);

  AppContextProvider.create({
    workspaceConfig: configController,
  });

  const dispatcher = new IntentDispatcher({
    ...VIEWER_INTENT_RESOLVERS(windowController, viewerRegistry),
    ...SETTINGS_INTENT_RESOLVERS(settingsController),
  });
  const host = new ExtensionHost(context, new RawEditorProvider(context, viewerRegistry), dispatcher);

  host.registerSelf();
}

export function deactivate(): void {
  // Everything disposable self-registered into the DisposableRegistry, which VS Code
  // tears down through context.subscriptions. Nothing to do here.
  DisposableStore.assignRegistry(null);
}
