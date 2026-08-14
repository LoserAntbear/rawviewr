import { WebViewCommandDispatcher } from '../commands/webViewCommandDispatcher';
import { WebviewDisposableStore } from '../disposable/WebviewDisposableStore';
import type { WebviewDisposable } from '../disposable/types';

export class WebviewSession implements WebviewDisposable {
  private readonly disposableStore = new WebviewDisposableStore();

  constructor(
    private readonly commandDispatcher: WebViewCommandDispatcher,
    private readonly listenTarget: EventTarget = document,
  ) {
    this.disposableStore.add(this.commandDispatcher.listen(this.listenTarget));
  }

  public dispose(): void {
    this.disposableStore.dispose();
  }
}
