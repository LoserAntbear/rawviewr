import * as vscode from 'vscode';
import type { SettingsController } from '@features/settings/SettingsController';
import type { ItemOpener, WebviewHostMessage, WebviewMessage } from './types';
import type { SourcesDecoder } from '@features/image/imageDecoder/SourcesDecoder';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import type { ExportFormat } from '@definitions/exportFormats';
import { ContextKeys, VSCodeCommands } from '@definitions/vscode';
import type { Endian } from '@definitions/bits';
import type { SourceLocation } from '@features/image/sourceReader/types';
import type { ZoomDirection } from '@features/zoom';

import type { FileSource } from '../types';
import { DisposableStore } from '@features/disposable/DisposableStore';
import appShellHtml from './app-shell.html';
import { StringTemplate } from '@utils/string/StringTemplate';
import { getNonce } from '../utils';
import { GalleryViewMode } from '../ui/webcomponents/types';
import { ImageExporter } from '@features/image/imageExport/ImageExporter';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';
import { attemptDetached } from '@utils/attempt';
import { SourceReader } from '@features/image/sourceReader/SourceReader';

// TODO: Extract webview posting and handlers into a separate messaging layer
export class WebviewHost extends DisposableStore {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly webview: vscode.Webview,
    private readonly sources: FileSource[],
    private readonly viewMode: GalleryViewMode,
    private readonly settingsController: SettingsController,
    private readonly sourcesDecoder: SourcesDecoder,
    private readonly itemOpener?: ItemOpener,
    private readonly exporter: ImageExporter = new ImageExporter(),
    private readonly sourceReader: SourceReader = new SourceReader(),
  ) {
    super();

    this.setWebviewOptions();

    // The listener is a sync edge: VS Code does not await it, so it is the last-resort boundary.
    this.disposables.push(
      this.webview.onDidReceiveMessage((message: WebviewMessage) => attemptDetached(
        () => this.handleWebviewMessage(message),
        (error) => console.error(`WebviewHost: handling "${message.type}" failed:`, error),
      )),
      // The context key is global: a view that goes away must not leave it set behind it.
      { dispose: () => attemptDetached(
        () => this.setFieldFocusContext(false),
        (error) => console.error('WebviewHost: failed to release the field-focus context:', error),
      ) },
    );

    this.updateWebviewHtml();
  }

  public requestExport(format: ExportFormat): Promise<void> {
    return this.post({ type: 'export', format });
  }

  public requestZoom(direction: ZoomDirection): Promise<void> {
    return this.post({ type: 'view:zoom', direction });
  }

  public async post(message: WebviewHostMessage): Promise<void> {
    if (!(await this.webview.postMessage(message))) {
      console.error('WebviewHost: Failed to post message to webview:', message);
    }
  }

  private updateWebviewHtml(): void {
    const script = this.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.js'),
    ).toString();
    const nonce = getNonce();
    const appHostTemplate = new StringTemplate(appShellHtml, ['script', 'nonce', 'cspSource']);

    this.webview.html = appHostTemplate.render({
      nonce,
      script,
      cspSource: this.webview.cspSource,
    });
  }

  private setWebviewOptions(): void {
    this.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
  }

  private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'app:ready':
          await this.handleAppReady();
          break;
        case 'gallery:openItem':
          await this.handleOpenItem(message.id);
          break;
        case 'export:png':
          //FIXME: Currently only exports the first source. Should handle the correct source based on the message context.
          await this.exporter.savePng(this.sources[0]?.uri, message.name, message.data);
          break;
        case 'sources:request:decode':
          await this.handleRequestDecode(message.ids, message.options);
          break;
        case 'probe:request':
          await this.handleProbeRequest(message.id, message.location, message.endian);
          break;
        case 'view:fieldFocus':
          await this.setFieldFocusContext(message.focused);
          break;
        case 'app:status':
          InfoMessageController.handleMessage({
            level: message.level,
            message: message.message,
          });
          break;
      }
    } catch (error) {
      InfoMessageController.handleMessage({
        level: 'error',
        message: 'Failed to handle webview message: ' + (error instanceof Error ? error.message : String(error)),
      });
    }
  }

  // TODO: Move out to the dedicated context controller.
  private async setFieldFocusContext(focused: boolean): Promise<void> {
    await vscode.commands.executeCommand(VSCodeCommands.SetContext, ContextKeys.FieldFocus, focused);
  }

  /**
   * The half of a reading the webview cannot take: it keeps no buffers, so the bytes behind
   * a pinned offset are read here. Silent on an unknown id — a view that outlived its source
   * is not worth a message box.
   */
  private async handleProbeRequest(id: string, location: SourceLocation, endian: Endian): Promise<void> {
    const source = this.sources.find((candidate) => candidate.id === id);

    if (!source) {
      return;
    }

    await this.post({
      id,
      location,
      type: 'probe:receive:source-bytes',
      bytes: await this.sourceReader.readFromFileSource(source, location, endian),
    });
  }

  private async handleOpenItem(id: string): Promise<void> {
    try {
      const source = this.sources.find((candidate) => candidate.id === id);

      if (source) {
        await this.itemOpener?.openSingle([source.uri]);
      }
    } catch (error) {
      console.error('Failed to handle open item:', error);
    }
  }

  private async handleAppReady(): Promise<void> {
    try {
      const decodeOptions = this.settingsController.readDefaultDecodeOptions();

      await this.initializeSession(this.viewMode, decodeOptions);
      await this.postSources();
      // Nothing to ask for on a first load: the sources and the options are both here.
      await this.handleRequestDecode(this.sources, decodeOptions);
    } catch (error) {
      InfoMessageController.handleMessage({
        level: 'error',
        message: 'Failed to handle app ready: ' + (error instanceof Error ? error.message : String(error)),
      });
    }
  }

  private initializeSession(viewMode: GalleryViewMode, decodeOptions: DecodeOptions): Promise<void> {
    // TODO: Should it include the ID? No use for it as I see, but MAYBE?
    return this.post({
      viewMode,
      decodeOptions,
      type: 'session:start',
    });
  }

  private postSources(): Promise<void> {
    return this.post({
      type: 'sources:update',
      sources: this.sources,
    });
  }

  private async handleRequestDecode(sources: FileSource[], options: DecodeOptions): Promise<void> {
    const decodedSources = await this.sourcesDecoder.decodeFromSource(sources, options);

    await this.post({
      type: 'images:decode:ready',
      images: decodedSources,
    });
  }
}
