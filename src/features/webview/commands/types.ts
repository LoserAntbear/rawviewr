import type { WebviewCommandKind } from './definitions';

export type WebviewCommand =
  {
    kind: WebviewCommandKind.Connected;
    payload: string;
  }
  | { kind: WebviewCommandKind.Ready; };


export type WebviewCommandResolver<K extends WebviewCommandKind = WebviewCommandKind> = (
  command: Extract<WebviewCommand, { kind: K }>,
) => void;
export type WebviewCommandResolversMap = { readonly [K in WebviewCommandKind]: WebviewCommandResolver<K> };
