import type { ResolverContext } from '@SHARED/features/messaging';
import type { WebviewMessage } from '@SHARED/features/messaging/protocol';
import type { AppStore } from '@WEBVIEW/features/store/types';

/**
 * What a resolver on the webview side acts through: the bridge out, and the store it owns.
 *
 * It lives here rather than beside the generic contracts because the store is the webview's
 * alone — a shared type defaulting to it was what let a channel's posted union and its received
 * union be conflated in the first place.
 */
export type WebviewResolverContext<TMessage = WebviewMessage> = ResolverContext<TMessage> & {
  readonly store: AppStore;
};
