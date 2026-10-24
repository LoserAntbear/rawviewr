
import { WebviewDisposableUtils } from '@SHARED/features/disposable';
import type { WebviewDisposable } from '@SHARED/features/disposable/types';
import { WebviewDisposableStore } from '@SHARED/features/disposable/WebviewDisposableStore';
import type { MessagePoster } from '@SHARED/features/messaging';
import type { WebviewMessage } from '@SHARED/features/messaging/protocol';
import { attemptDetached } from '@utils/attempt';

import { getFocusElementDeep, isFormControlElement } from '../../utils/html';

const FOCUS_EVENTS = ['focus', 'focusin', 'focusout'] as const;

/**
 * The idea here is simple:
 * to track whether any `form control element` within the window has focus
 * then report it to the webview host.
 *
 * Why:
 * The webview host needs to know the focus state of form control elements to manage keyboard shortcuts and other UI interactions appropriately.
 *
 * Yes, this seems fragile, however will be using this method for now.
 *
 * The other option is to define a dedicated `KEYBOARD_SHORTCUTS_MODE` controller/
 * Which will be triggered only for specific combination of control keys, e.g. `ctrl+alt`+key.
 * Where pressed `ctrl+alt` === `KEYBOARD_SHORTCUTS_MODE_ACTIVE`
 */
export class FieldFocusTracker {
  private isAnyFieldFocused: boolean = false;

  constructor(private readonly bridge: MessagePoster<WebviewMessage>) {}

  public watch(target: Window): WebviewDisposable {
    const store = new WebviewDisposableStore();

    store.add([
      // Blur must be handled separately because it does not bubble.
      WebviewDisposableUtils.listenTo(target, 'blur', () => this.assignFieldFocus(false)),
      ...FOCUS_EVENTS.map((event) => WebviewDisposableUtils.listenTo(
        target,
        event,
        () => this.assignFieldFocus(isFormControlElement(getFocusElementDeep(target.document))),
      )),
    ]);

    this.startFieldFocusReportTracking(target);

    return store;
  }

  private startFieldFocusReportTracking(target: Window): void {
    this.assignFieldFocus(isFormControlElement(getFocusElementDeep(target.document)));
  }

  private assignFieldFocus(focused: boolean): void {
    if (this.isAnyFieldFocused === focused) {
      return;
    }

    this.isAnyFieldFocused = focused;

    attemptDetached(
      () => this.bridge.post({ type: 'view:fieldFocus', focused: this.isAnyFieldFocused }),
      (error) => {
        console.error('Failed to post field focus state:', error);
      },
    )
  }
}
