import * as vscode from 'vscode';

import { AppContextProvider } from '@EXTENSION/features/appContext/AppContextProvider';
import { DisposableRegistry } from '@EXTENSION/features/disposable/DisposableRegistry';
import { DisposableStore } from '@EXTENSION/features/disposable/DisposableStore';
import { RawEditorProvider } from '@EXTENSION/features/editor/RawEditorProvider';
import { ExtensionHost } from '@EXTENSION/features/extension/ExtensionHost';
import { SourcesDecoder } from '@EXTENSION/features/image/imageDecoder/SourcesDecoder';
import { IntentDispatcher } from '@EXTENSION/features/intent/IntentDispatcher';
import { SETTINGS_INTENT_RESOLVERS } from '@EXTENSION/features/settings/resolvers';
import { SettingsController } from '@EXTENSION/features/settings/SettingsController';
import { VSCodeWorkspaceConfigurationController } from '@EXTENSION/features/settings/VSCodeWorkspaceConfig/VScodeWorkspaceConfigurationController';
import { ViewerRegistry } from '@EXTENSION/features/viewer/registry/viewerRegistry';
import { VIEW_INTENT_RESOLVERS, VIEWER_INTENT_RESOLVERS } from '@EXTENSION/features/viewer/resolvers';
import { ViewerWindowController } from '@EXTENSION/features/viewer/windowController/ViewerWindowController';
import { attemptDetached } from '@utils/attempt';

export function activate(context: vscode.ExtensionContext): void {
  // DISCLAIMER: Must be created before any DisposableStore, so that the latter can self-register into it.
  const disposableRegistry = new DisposableRegistry();

  DisposableStore.assignRegistry(disposableRegistry);
  context.subscriptions.push(disposableRegistry);

  const viewerRegistry = new ViewerRegistry();
  const configController = new VSCodeWorkspaceConfigurationController(
    new vscode.EventEmitter(),
  );
  const settingsController = new SettingsController(
    context.workspaceState,
    configController,
  );
  const sourcesDecoder = new SourcesDecoder();

  const windowController = new ViewerWindowController(
    context,
    viewerRegistry,
    settingsController,
    sourcesDecoder,
  );
  const rawEditorProvider = new RawEditorProvider(
    context,
    viewerRegistry,
    settingsController,
    sourcesDecoder,
    windowController,
  );

  AppContextProvider.create({
    workspaceConfig: configController,
  });

  const dispatcher = new IntentDispatcher({
    ...VIEW_INTENT_RESOLVERS(viewerRegistry),
    ...VIEWER_INTENT_RESOLVERS(windowController),
    ...SETTINGS_INTENT_RESOLVERS(settingsController),
  });

  context.subscriptions.push(viewerRegistry.onEmpty(() => attemptDetached(
    () => settingsController.clearToolbarSnapshot(),
    (error) => console.error('Failed to release the preserved toolbar:', error),
  )));

  const host = new ExtensionHost(context, rawEditorProvider, dispatcher);

  host.registerSelf();
}

export function deactivate(): void {
  // Everything disposable self-registered into the DisposableRegistry, which VS Code
  // tears down through context.subscriptions. Nothing to do here.
  DisposableStore.assignRegistry(null);
}
