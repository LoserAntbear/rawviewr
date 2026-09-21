import type { GalleryViewMode } from '../../../types';
import type { DisplayedItem, StatusBarStateContext } from '../../state/types';
import type { SlotLifecycleMode } from './definitions';
import type { StatusBarEntry } from '../types';

export type StatusSegmentAlignment = 'start' | 'end';

export type StatusSegment = {
  readonly id: string;

  readonly mode?: SlotLifecycleMode;
  /** Lights a dashboard telltale for its level. For segments that carry messages, not readouts. */
  readonly telltale?: boolean;
  // Return null to render nothing.
  readonly resolve: (context: StatusBarStateContext) => StatusBarEntry | null;
};

/**
 * One strategy per view mode. Keyed by `GalleryViewMode`, so every segment has to answer
 * for every mode — a new mode is a compile error until each segment says what it shows.
 */
export type ModeStrategies<TResult> = {
  readonly [M in GalleryViewMode]: (context: StatusBarStateContext) => TResult;
};

type DisplayedItemKind = DisplayedItem['kind'];

export type DisplayedItemStrategy<TResult, K extends DisplayedItemKind = DisplayedItemKind> = (
  displayedItem: Extract<DisplayedItem, { kind: K }>,
  context: StatusBarStateContext,
) => TResult;

/** One strategy per state the displayed item can be in, each handed its own narrowed shape. */
export type DisplayedItemStrategies<TResult> = {
  readonly [K in DisplayedItemKind]: DisplayedItemStrategy<TResult, K>;
};
