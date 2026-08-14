import type { WebviewDisposable } from './types';

/**
 * The reason for it to exist is to couple disposable functionality
 * Just to make sure, you know?
 */
export function listenTo<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K | string,
  handler: EventListener,
  options?: AddEventListenerOptions,
): WebviewDisposable {
  target.addEventListener(type, handler, options);

  return {
    dispose: () => target.removeEventListener(type, handler, options),
  };
}
