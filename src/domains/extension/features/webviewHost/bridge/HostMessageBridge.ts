import type * as vscode from 'vscode';

import type { WebviewHostMessage, WebviewMessage } from '@SHARED/features/messaging/protocol';
import type { MessagePoster } from '@SHARED/features/messaging/types';

type MessageListener = (message: WebviewMessage) => void;

export class HostMessageBridge implements MessagePoster<WebviewHostMessage> {
  constructor(private readonly webview: vscode.Webview) {}

  public async post(message: WebviewHostMessage): Promise<void> {
    try {
      if (!(await this.webview.postMessage(message))) {
        console.error('WebviewHost: Failed to post message to webview:', message);
      }
    } catch (error) {
      console.error('WebviewHost: Failed to post message to webview:', error);
    }
  }

  public listen(listener: MessageListener): vscode.Disposable {
    return this.webview.onDidReceiveMessage(listener);
  }
}
