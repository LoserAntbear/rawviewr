import type { WebviewMessage } from '../../webviewHost/types';

export type StatusLevel = Extract<WebviewMessage, { type: 'app:status' }>['level'];
