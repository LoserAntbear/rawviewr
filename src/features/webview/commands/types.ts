import type { WebviewCommandType } from './definitions';

export type WebviewCommand =
  | { type: WebviewCommandType.AppReady; }
  | { type: WebviewCommandType.GalleryOpenItem; payload: string; }
  | { type: WebviewCommandType.WebviewConnected; payload: string; };


export type WebviewCommandResolver<K extends WebviewCommandType = WebviewCommandType> = (
  command: Extract<WebviewCommand, { type: K }>,
) => void;
export type WebviewCommandResolversMap = { readonly [K in WebviewCommandType]: WebviewCommandResolver<K> };
