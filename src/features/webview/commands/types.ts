import type { WebviewMessage, WebviewMessageType } from '../webviewHost/types';

export type WebviewCommandResolver<K extends WebviewMessageType = WebviewMessageType> = (
  message: Extract<WebviewMessage, { type: K }>,
) => void | Promise<void>;
export type WebviewCommandResolversMap = {
  readonly [K in WebviewMessageType]?: WebviewCommandResolver<K>;
};
