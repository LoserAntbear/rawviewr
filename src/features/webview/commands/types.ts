import type { WebviewCommandType } from './definitions';

export type WebviewCommand =
  {
    type: WebviewCommandType.Connected;
    payload: string;
  }
  | { type: WebviewCommandType.Ready; };


export type WebviewCommandResolver<K extends WebviewCommandType = WebviewCommandType> = (
  command: Extract<WebviewCommand, { type: K }>,
) => void;
export type WebviewCommandResolversMap = { readonly [K in WebviewCommandType]: WebviewCommandResolver<K> };
