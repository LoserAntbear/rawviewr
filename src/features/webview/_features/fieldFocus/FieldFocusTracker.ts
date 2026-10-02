import { WebviewDisposableUtils } from '../../disposable';
import { WebviewDisposableStore } from '../../disposable/WebviewDisposableStore';
import type { WebviewDisposable } from '../../disposable/types';
import type { MessagePoster } from '../../messaging';
import { getFocusElementDeep, isFormControlElement } from '../../utils/html';

const FOCUS_EVENTS = ['focus', 'focusin', 'focusout'] as const;

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
