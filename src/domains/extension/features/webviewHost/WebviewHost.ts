import type * as vscode from 'vscode';

import { DisposableStore } from '@EXTENSION/features/disposable/DisposableStore';
import { DecodeRunner } from '@EXTENSION/features/image/imageDecoder/DecodeRunner';
import type { SourcesDecoder } from '@EXTENSION/features/image/imageDecoder/SourcesDecoder';
import { ImageExporter } from '@EXTENSION/features/image/imageExport/ImageExporter';
import { SourceReader } from '@EXTENSION/features/image/sourceReader/SourceReader';
import { InfoMessageController } from '@EXTENSION/features/infoMessage/InfoMessageController';
import type { SettingsController } from '@EXTENSION/features/settings/SettingsController';
import type { ContentViewSession } from '@EXTENSION/features/viewer/contentViewSession';
import { ContextKeyController } from '@EXTENSION/features/vscode/contextKeys';
import type { WebviewHostMessage } from '@SHARED/features/messaging/protocol';
import type { UriOpener } from '@SHARED/features/viewer/types';
import { attemptDetached } from '@utils/attempt';

import { WebviewAppRenderShell } from './appShell';
import { HostMessageBridge } from './bridge';
import { HostMessageDispatcher, WEBVIEW_MESSAGE_RESOLVERS } from './hostDispatcher';

export class WebviewHost extends DisposableStore {
  private readonly bridge: HostMessageBridge;

  constructor(
    context: vscode.ExtensionContext,
    webview: vscode.Webview,
    session: ContentViewSession,
    settingsController: SettingsController,
    sourcesDecoder: SourcesDecoder,
    uriOpener?: UriOpener,
    exporter: ImageExporter = new ImageExporter(),
    sourceReader: SourceReader = new SourceReader(),
    contextKeys: ContextKeyController = new ContextKeyController(),
  ) {
    super();

    const bridge = new HostMessageBridge(webview);

    this.bridge = bridge;

    const dispatcher = new HostMessageDispatcher(
      WEBVIEW_MESSAGE_RESOLVERS,
      bridge,
      {
        session,
        exporter,
        uriOpener,
        contextKeys,
        reader: sourceReader,
        settings: settingsController,
        messages: InfoMessageController,
        decodes: new DecodeRunner(sourcesDecoder),
      },
    );

    this.disposables.push(
      dispatcher.listen(),
      // If we want to share the options b/w all views, we listen for changes and propagate them.
      settingsController.onToolbarSnapshotChange((snapshot) => attemptDetached(
        () => bridge.post({ type: 'decode:options:preserved', snapshot }),
        (error) => console.error('WebviewHost: failed to push the toolbar snapshot:', error),
      )),
      // A setting the user changes while looking at a view should reach that view. So we must subscribe to it
      settingsController.onViewerConfigurationChange((config) => attemptDetached(
        () => bridge.post({ type: 'view:config:update', config }),
        (error) => console.error('WebviewHost: failed to push the viewer configuration:', error),
      )),
      { dispose: () => attemptDetached(
        () => contextKeys.releaseAll(),
        (error) => console.error('WebviewHost: failed to release the field-focus context:', error),
      ) },
    );

    new WebviewAppRenderShell(context.extensionUri).render(webview);
  }

  public postToWebview(message: WebviewHostMessage): Promise<void> {
    return this.bridge.post(message);
  }
}
