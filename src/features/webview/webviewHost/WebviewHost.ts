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

    this.disposables.push(
      this.webview.onDidReceiveMessage(this.handleWebviewMessage.bind(this)),
    );

    this.updateWebviewHtml();
  }


  public requestExport(format: ExportFormat): Promise<void> {
    return this.post({ type: 'export', format });
  }

  public async post(message: WebviewHostMessage): Promise<void> {
    if (!this.webview.postMessage(message)) {
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
        this.handleOpenItem(message.id);
        break;
      case 'export:png':
        await this.exporter.savePng(this.sources[0]?.uri, message.name, message.data);
        break;
      case 'app:status':
        await InfoMessageController.handleMessage({
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

  private handleOpenItem(id: string): void {
    try {
      const source = this.sources.find((candidate) => candidate.id === id);

      if (source) {
        void this.itemOpener?.openSingle([source.uri]);
      }
    } catch (error) {
      console.error('Failed to handle open item:', error);
    }
  }

  private async handleAppReady(): Promise<void> {
    this.initializeSession(this.viewMode);
    this.postPreloaders();
    this.readAndPostSources();
  }

  private initializeSession(viewMode: GalleryViewMode): void {
    // TODO: Should it include the ID? No use for it as I see, but MAYBE?
    this.post({
      viewMode,
      type: 'session:start',
      decodeOptions: this.settingsController.readDefaultDecodeOptions(),
    });
  }

  private postPreloaders(): void {
    // I pre-build a payload of empty sources to trigger UI render
    // And add separate loading to each one
    // so that the UI can still be responsive and show progress for each file
    const itemPreloaders: BufferItem[] = this.sources.map(BufferItem.stubFromFileSource);

    this.post({
      type: 'items',
      items: itemPreloaders,
    });
  }

  private async readAndPostSources(): Promise<void> {
    for (const source of this.sources) {
      try {
        const item = await BufferItem.fromFileSource(source);

        if (!FileValidator.isValidFileSize(item.data.byteLength)) {
          throw new Error(`File size exceeds the maximum allowed size of ${FileValidator.maxFileSizeMB} MB.`);
        }

        this.post({
          items: [item],
          type: 'items',
        });
      } catch (error) {
        this.propagateErrorToWebview(error);
      }
    }
  }

  private propagateErrorToWebview(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    this.post({
      message,
      type: 'status:error',
    });
  }
}
