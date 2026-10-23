import * as vscode from 'vscode';

import { StringTemplate } from '@utils/string/StringTemplate';

import { getNonce } from '../../utils';
import appShellHtml from '../app-shell.html';

export class WebviewAppRenderShell {
  constructor(private readonly extensionUri: vscode.Uri) {}

  public render(webview: vscode.Webview): void {
    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webview.html = new StringTemplate(
      appShellHtml,
      ['script', 'nonce', 'cspSource'],
    ).render({
      nonce: getNonce(),
      cspSource: webview.cspSource,
      script: webview.asWebviewUri(
        // TODO: Move these to config, instead of inlining
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js'),
      ).toString(),
    });
  }
}
