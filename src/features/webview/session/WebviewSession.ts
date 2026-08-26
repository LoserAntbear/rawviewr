import { WebViewCommandDispatcher } from '../commands/webViewCommandDispatcher';
import { WebviewDisposableStore } from '../disposable/WebviewDisposableStore';
import type { WebviewDisposable } from '../disposable/types';
import type { WebviewSessionCommunicationBridge } from './WebviewSessionCommunicationBridge';
import type { WebviewHostMessage } from '../types';
import type { BufferItem } from '../buffer';
import { BufferItemRegistry } from '../buffer/BufferItemRegistry';


export class WebviewSession implements WebviewDisposable {
  private readonly disposableStore = new WebviewDisposableStore();

  constructor(
    private readonly commandDispatcher: WebViewCommandDispatcher,
    private readonly bridge: WebviewSessionCommunicationBridge,
    private readonly listenTarget: EventTarget = document,
    private readonly itemRegistry = new BufferItemRegistry(),
  ) {
    this.disposableStore.add(
      [
        this.commandDispatcher.listen(this.listenTarget),
        this.bridge.listenToWebviewHost(this.handleWebviewHostMessage.bind(this)),
      ],
    );
  }

  public dispose(): void {
    this.disposableStore.dispose();
  }

  private handleWebviewHostMessage(message: WebviewHostMessage): void {
    console.log('WebviewSession: Received message from webview host:', message);
    switch (message.type) {
      case 'items':
        this.handleWebviewItemsMessage(message.items);
        break;
      case 'error':
        this.handleWebviewErrorMessage(message.message);
        break;
      default:
        console.warn('WebviewSession: Unknown message type from webview host:', message);
    }
  }

  private handleWebviewItemsMessage(items: BufferItem[]): void {
    console.log('WebviewSession: Received items from webview:', items);
    this.itemRegistry.add(items);
  }

  private handleWebviewErrorMessage(message: string): void {
    console.error('WebviewSession: Error message from webview host:', message);
  }
}
