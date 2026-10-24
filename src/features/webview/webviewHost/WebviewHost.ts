import type * as vscode from 'vscode';

import type { ExportFormat } from '@definitions/exportFormats';
import { DisposableStore } from '@features/disposable/DisposableStore';
import { DecodeRunner } from '@features/image/imageDecoder/DecodeRunner';
import type { SourcesDecoder } from '@features/image/imageDecoder/SourcesDecoder';
import { ImageExporter } from '@features/image/imageExport/ImageExporter';
import { SourceReader } from '@features/image/sourceReader/SourceReader';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';
import type { SettingsController } from '@features/settings/SettingsController';
import type { UriOpener } from '@features/viewer/types';
import { ContextKeyController } from '@features/vscode/contextKeys';
import type { ZoomDirection } from '@features/zoom';
import { attemptDetached } from '@utils/attempt';

import type { ContentViewSession } from '../../viewer/contentViewSession';

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

  // FIXME: Scope to the webview message, not global extension command
  public requestExport(format: ExportFormat): Promise<void> {
    return this.bridge.post({ type: 'export', format });
  }

  // FIXME: Scope to the webview message, not global extension command
  public requestZoom(direction: ZoomDirection): Promise<void> {
    return this.bridge.post({ type: 'view:zoom', direction });
  }
}
