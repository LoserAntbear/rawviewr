import type { StatusSegment } from '../segment/types';

export class ElementBuilder {
  public static buildSegment(segment: StatusSegment): HTMLElement {
    const element = document.createElement('span');

    element.className = 'segment';
    element.dataset.segmentId = segment.id;

    if (segment.mode === 'announce') {
      element.setAttribute('role', 'status');
    }

    return element;
  }

  public static buildSpacer(): HTMLElement {
    const spacer = document.createElement('span');

    spacer.className = 'spacer';

    return spacer;
  }
}
