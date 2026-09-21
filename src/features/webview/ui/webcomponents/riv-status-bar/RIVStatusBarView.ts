import { RIVView } from '../RIVView';
import { ElementBuilder } from './ElementBuilder';
import { STATUS_SEGMENTS } from './segments';
import type { StatusBarEntry, StatusBarState } from './state/types';
import { type StatusSegment } from './segment/types';
import { SlotLifecycleMode } from './segment/definitions';

type SegmentSlot = {
  readonly element: HTMLElement;

  readonly mode?: SlotLifecycleMode;
};

export class RIVStatusBarView extends RIVView {
  private readonly slots = new Map<string, SegmentSlot>();

  public build(): void {
    const root = this.ref('status-bar');

    if (!root) {
      throw new Error('riv-status-bar: template is missing #status-bar');
    }

    // Mirrors `replaceChildren`: the map describes the DOM that is there now.
    this.slots.clear();

    root.replaceChildren(
      ...this.buildSlots(STATUS_SEGMENTS.get('start') ?? []),
      ElementBuilder.buildSpacer(),
      ...this.buildSlots(STATUS_SEGMENTS.get('end') ?? []),
    );
  }

  public render(state: StatusBarState): void {
    for (const [id, { element, mode }] of this.slots) {
      const entry = state[id] ?? null;

      if(this.hideElementIfNeeded(element, entry, mode)) {
        continue;
      }

      element.textContent = entry?.text ?? '';
      element.dataset.level = entry?.level ?? 'info';
    }
  }

  private buildSlots(segments: StatusSegment[]): HTMLElement[] {
    return segments.map((segment) => {
      const element = ElementBuilder.buildSegment(segment);

      this.slots.set(segment.id, { element, mode: segment.mode });

      return element;
    });
  }

  private hideElementIfNeeded(element: HTMLElement, entry: StatusBarEntry | null  , mode?: SlotLifecycleMode): boolean {
    if (mode === SlotLifecycleMode.LiveUpdate) {
      return false;
    }

    element.hidden = entry === null;

    return element.hidden;
  }
}
