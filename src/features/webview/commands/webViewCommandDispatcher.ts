import type { WebviewCommand, WebviewCommandResolversMap } from './types';

export class WebViewCommandDispatcher {
  constructor(private readonly resolvers: WebviewCommandResolversMap) {}

  public dispatch(command: WebviewCommand, payload: unknown): void {
    const resolver = this.resolvers[command.kind];

    if (!resolver) {
      console.warn(`No resolver found for command: ${command.kind}`);
      return;
    }

    resolver(command, payload);
  }
}