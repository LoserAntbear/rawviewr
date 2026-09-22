import type { KindStrategies, Strategies } from '@utils/strategy';

import type { GalleryViewMode } from '../../../types';
import type { DisplayedItem, StatusBarStateContext } from '../../state/types';
import type { SlotLifecycleMode } from './definitions';
import type { StatusBarEntry } from '../types';

export type StatusSegmentAlignment = 'start' | 'end';

export type StatusSegment = {
  readonly id: string;

  readonly indicator?: boolean;
  readonly mode?: SlotLifecycleMode;

  // Return null to render nothing.
  readonly resolve: (context: StatusBarStateContext) => StatusBarEntry | null;
};

export type ModeStrategies<TResult> = Strategies<GalleryViewMode, [context: StatusBarStateContext], TResult>;
export type DisplayedItemStrategies<TResult> = KindStrategies<
  DisplayedItem,
  [context: StatusBarStateContext],
  TResult
>;
