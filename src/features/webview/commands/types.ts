import type { WebviewCommandKind } from './definitions';

export type WebviewCommand = {
  kind: WebviewCommandKind;
};

export type WebviewCommandResolver = (command: WebviewCommand) => void;
export type WebviewCommandResolversMap = Record<WebviewCommandKind, WebviewCommandResolver>;