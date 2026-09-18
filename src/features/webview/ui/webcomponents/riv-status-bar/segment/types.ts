import type { GalleryViewMode } from '../../types';
import type { DisplayedItem, StatusContext, StatusText } from '../state/types';
import type { StatusMode } from './definitions';

export type StatusSegmentAlignment = 'start' | 'end';

export type StatusSegment = {
  readonly id: string;

  readonly mode?: StatusMode;
  /** `null` hides the segment. */
  readonly resolve: (context: StatusContext) => StatusText | null;
};

/**
 * One strategy per view mode. Keyed by `GalleryViewMode`, so every segment has to answer
 * for every mode — a new mode is a compile error until each segment says what it shows.
 */ 
export type ModeStrategies<TResult> = {
  readonly [M in GalleryViewMode]: (context: StatusContext) => TResult;
};

type DisplayedItemKind = DisplayedItem['kind'];

export type DisplayedItemStrategy<TResult, K extends DisplayedItemKind = DisplayedItemKind> = (
  displayedItem: Extract<DisplayedItem, { kind: K }>,
  context: StatusContext,
) => TResult;

/** One strategy per state the displayed item can be in, each handed its own narrowed shape. */
export type DisplayedItemStrategies<TResult> = {
  readonly [K in DisplayedItemKind]: DisplayedItemStrategy<TResult, K>;
};
