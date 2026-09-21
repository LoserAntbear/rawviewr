import type { StatusSegment } from '../segment/types';
import { SlotLifecycleMode } from '../segment/definitions';

export class ElementBuilder {
  public static buildSegment(segment: StatusSegment): HTMLElement {
    const element = document.createElement('span');

    element.className = 'segment';
    element.dataset.segmentId = segment.id;

    if (segment.mode === SlotLifecycleMode.LiveUpdate) {
      element.setAttribute('role', 'status');
    }

    if (segment.telltale) {
      element.classList.add('telltale');
    }

    return element;
  }

  public static buildSpacer(): HTMLElement {
    const spacer = document.createElement('span');

    spacer.className = 'spacer';

    return spacer;
  }
}
