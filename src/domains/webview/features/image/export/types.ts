import type { WebviewMessage } from '@SHARED/features/messaging/protocol';

export type StatusLevel = Extract<WebviewMessage, { type: 'app:status' }>['level'];
