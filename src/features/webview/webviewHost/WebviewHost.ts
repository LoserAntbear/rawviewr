import * as vscode from 'vscode';

import type { SettingsController } from '@features/settings/SettingsController';
import type { ItemOpener, WebviewHostMessage, WebviewMessage } from './types';
import type { ExportFormat } from '@definitions/exportFormats';
import type { FileSource } from '../types';
import { DisposableStore } from '@features/disposable/DisposableStore';
import appShellHtml from './app-shell.html';
import { StringTemplate } from '@utils/string/StringTemplate';
import { getNonce } from '../utils';
import { BufferItem } from '@features/buffer/BufferItem';
import { FileValidator } from '@features/file/FileValidator';
import { GalleryViewMode } from '../ui/webcomponents/types';
import { ImageExporter } from '@features/image/imageExport/ImageExporter';
import { InfoMessageController } from '@features/infoMessage/InfoMessageController';
import { attemptDetached } from '@utils/attempt';

export class WebviewHost extends DisposableStore {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly webview: vscode.Webview,
    private readonly sources: FileSource[],
    private readonly viewMode: GalleryViewMode,
    private readonly settingsController: SettingsController,
    private readonly itemOpener?: ItemOpener,
    private readonly exporter: ImageExporter = new ImageExporter(),
  ) {
    super();

    this.setWebviewOptions();

    // The listener is a sync edge: VS Code does not await it, so it is the last-resort boundary.
    this.disposables.push(
      this.webview.onDidReceiveMessage((message: WebviewMessage) => attemptDetached(
        () => this.handleWebviewMessage(message),
        (error) => console.error(`WebviewHost: handling "${message.type}" failed:`, error),
      )),
    );

    this.updateWebviewHtml();
  }


  public requestExport(format: ExportFormat): Promise<void> {
    return this.post({ type: 'export', format });
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
    switch (message.type) {
      case 'app:ready':
        await this.handleAppReady();
        break;
      case 'gallery:openItem':
        await this.handleOpenItem(message.id);
        break;
      case 'export:png':
        await this.exporter.savePng(this.sources[0]?.uri, message.name, message.data);
        break;
      case 'app:status':
        InfoMessageController.handleMessage({
          level: message.level,
          message: message.message,
        });
        break;
      // case 'optionsChanged':
      //   this.options = message.options;
      //   this.saveOptions();
      //   break;
    }
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
    await this.initializeSession(this.viewMode);
    await this.postSources();
    await this.readAndPostSources();
  }

  private initializeSession(viewMode: GalleryViewMode): Promise<void> {
    // TODO: Should it include the ID? No use for it as I see, but MAYBE?
    return this.post({
      viewMode,
      type: 'session:start',
      decodeOptions: this.settingsController.readDefaultDecodeOptions(),
    });
  }

  private postSources(): Promise<void> {
      return this.post({
      type: 'sources:update',
      sources: this.sources,
    });
  }

  private async readAndPostSources(): Promise<void> {
    for (const source of this.sources) {
      try {
        const item = await BufferItem.fromFileSource(source);

        if (!FileValidator.isValidFileSize(item.data.byteLength)) {
          throw new Error(`File size exceeds the maximum allowed size of ${FileValidator.maxFileSizeMB} MB.`);
        }

        await this.post({
          sources: [item],
          type: 'sources:update',
        });
      } catch (error) {
        await this.propagateErrorToWebview(error);
      }
    }
  }

  private propagateErrorToWebview(error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);

    return this.post({
      message,
      type: 'status:error',
    });
  }
}
