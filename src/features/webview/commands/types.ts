import type { WebviewCommandKind } from './definitions';

export type WebviewCommand<
  Payload = unknown,
> = {
  kind: WebviewCommandKind;

  payload?: Payload;
};

export type WebviewCommandResolver<Payload = unknown> = (command: WebviewCommand, payload: Payload) => void;
export type WebviewCommandResolversMap = Record<WebviewCommandKind, WebviewCommandResolver>;