import { RIVView } from '../../RIVView';
import { ElementBuilder } from './ElementBuilder';
import { type StatusSegmentsMap } from './segment/segments';
import type { StatusBarEntry, StatusBarRenderEntries } from './types';
import type { StatusBarStateContext } from '../state/types';
import { type StatusSegment } from './segment/types';
import { SlotLifecycleMode } from './segment/definitions';

type SegmentSlot = {
  readonly element: HTMLElement;

  readonly mode?: SlotLifecycleMode;
};

export class RIVStatusBarView extends RIVView {
  private readonly slots = new Map<string, SegmentSlot>();
  private readonly segments: StatusSegmentsMap;

  constructor(
    root: ShadowRoot,
    segments: StatusSegmentsMap,
  ) {
    super(root);
    this.segments = segments;
  }

  public build(): void {
    const root = this.ref('status-bar');

    if (!root) {
      throw new Error('riv-status-bar: template is missing #status-bar');
    }

    // Mirrors `replaceChildren`: the map describes the DOM that is there now.
    this.slots.clear();

    root.replaceChildren(
      ...this.buildSlots(this.segments.get('start') ?? []),
      ElementBuilder.buildSpacer(),
      ...this.buildSlots(this.segments.get('end') ?? []),
    );
  }

  public render(context: StatusBarStateContext): void {
    const entries = this.resolveStatusBarRenderEntries(context);

    for (const [id, { element, mode }] of this.slots) {
      const entry = entries[id] ?? null;

      if(this.hideElementIfNeeded(element, entry, mode)) {
        continue;
      }

      element.textContent = entry?.text ?? '';
      element.dataset.level = entry?.level ?? 'info';
      element.toggleAttribute('data-loading', entry?.loading === true);
    }
  }

  private buildSlots(segments: StatusSegment[]): HTMLElement[] {
    return segments.map((segment) => {
      const element = ElementBuilder.buildSegment(segment);

      this.slots.set(segment.id, { element, mode: segment.mode });

      return element;
    });
  }

  private resolveStatusBarRenderEntries(
    context: StatusBarStateContext,
  ): StatusBarRenderEntries {
    return Object.fromEntries(
      Array.from(this.segments.values())
        .flat()
        .map((segment) => [segment.id, segment.resolve(context)]),
    );
  }

  private hideElementIfNeeded(element: HTMLElement, entry: StatusBarEntry | null  , mode?: SlotLifecycleMode): boolean {
    if (mode === SlotLifecycleMode.LiveUpdate) {
      return false;
    }

    element.hidden = entry === null;

    return element.hidden;
  }
}
