import * as vscode from 'vscode';

import type { FileSource, WebviewHostMessage, WebviewMessage } from './types';
import { DisposableStore } from '@features/disposable/DisposableStore';
import appShellHtml from './app-shell.html';
import { StringTemplate } from '@utils/string/StringTemplate';
import { getNonce } from './utils';
import { BufferItem } from '@features/webview/buffer';
import { FileValidator } from '@features/file/FileValidator';

export class WebviewHost extends DisposableStore {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly webview: vscode.Webview,
    private readonly sources: FileSource[],
  ) {
    super();

    this.setWebviewOptions();

    this.disposables.push(
      this.webview.onDidReceiveMessage(this.handleWebviewMessage.bind(this)),
    );

    this.updateWebviewHtml();
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
    // const style = this.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'viewer.css'));
    const nonce = getNonce();
    const appHostTemplate = new StringTemplate(appShellHtml, ['script', 'nonce']);

    this.webview.html = appHostTemplate.render({
      nonce,
      script,
    });
  }


  private setWebviewOptions(): void {
    this.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
  }

  private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    console.log('WebviewHost: Received message from webview:', message);

    switch (message.type) {
      case 'app:ready':
        await this.handleAppReady();
        break;
      // case 'optionsChanged':
      //   this.options = message.options;
      //   this.saveOptions();
      //   break;
      // case 'openItem': {
      //   const source = this.sources.find((s) => s.id === message.id);
      //   if (source) {
      //     this.onOpenItem?.(source.uri);
      //   }
      //   break;
      // }
      // case 'png':
      //   await this.savePng(message.name, message.base64);
      //   break;
      // case 'status':
      //   if (message.level === 'error') {
      //     void vscode.window.showErrorMessage(message.message);
      //   } else {
      //     void vscode.window.showInformationMessage(message.message);
      //   }
      //   break;
    }
  }

  private async handleAppReady(): Promise<void> {
    this.postPreloaders();
    this.readAndPostSources();
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

        if (!FileValidator.isValidFileSize(item.byteLength)) {
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
      type: 'error',
    });
  }
}
