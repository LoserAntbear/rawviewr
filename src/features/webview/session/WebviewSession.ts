import { WebviewCommandDispatcher } from '../commands/webviewCommandDispatcher';
import { WebviewDisposableStore } from '../disposable/WebviewDisposableStore';
import type { WebviewDisposable } from '../disposable/types';
import type { WebviewHostMessageDispatcher } from '../webviewHost/messageDispatcher/WebviewHostMessageDispatcher';


export class WebviewSession implements WebviewDisposable {
  private readonly disposableStore = new WebviewDisposableStore();

  constructor(
    private readonly commandDispatcher: WebviewCommandDispatcher,
    private readonly hostMessageDispatcher: WebviewHostMessageDispatcher,
    private readonly listenTarget: EventTarget = document,
  ) {
    this.disposableStore.add(
      [
        this.commandDispatcher.listen(this.listenTarget),
        this.hostMessageDispatcher.listen(window), // Probably should try `listenTarget` instead of `window`
      ],
    );
  }

  public dispose(): void {
    this.disposableStore.dispose();
  }
}
