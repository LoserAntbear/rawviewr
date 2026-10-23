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
import { HOST_MESSAGE_RESOLVERS, HostMessageDispatcher } from './hostDispatcher';
import type { WebviewHostMessage } from './types';

/**
 * One view: the page it runs, the wire it talks over, and the table that answers it.
 *
 * Composition and the face the rest of the extension calls — the viewer registry asks a view to
 * zoom or to export, and everything coming the other way is the dispatcher's.
 */
export class WebviewHost extends DisposableStore {
  constructor(
    context: vscode.ExtensionContext,
    webview: vscode.Webview,
  ) {
    super();

    new WebviewAppRenderShell(context.extensionUri).render(webview);
  }
}
