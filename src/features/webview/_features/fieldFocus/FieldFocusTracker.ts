import { WebviewDisposableUtils } from '../../disposable';
import { WebviewDisposableStore } from '../../disposable/WebviewDisposableStore';
import type { WebviewDisposable } from '../../disposable/types';
import type { MessagePoster } from '../../messaging';
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

  constructor(private readonly bridge: MessagePoster) {}

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

    this.bridge.postToWebviewHost({ type: 'view:fieldFocus', focused: this.isAnyFieldFocused });
  }
}
