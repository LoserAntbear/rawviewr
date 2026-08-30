import type { WebviewHostMessage, WebviewHostMessageType } from '../types';

export type WebviewHostMessageResolver = (message: WebviewHostMessage) => Promise<void> | void;
export type WebviewHostMessageResolverMap = Record<WebviewHostMessageType, WebviewHostMessageResolver>;
