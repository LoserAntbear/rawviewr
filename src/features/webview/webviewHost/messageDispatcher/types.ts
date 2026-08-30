import type { WebviewHostMessage } from '../types';

export type WebviewHostMessageResolver = (message: WebviewHostMessage) => Promise<void>;
export type WebviewHostMessageResolverMap = Record<string, WebviewHostMessageResolver>;
