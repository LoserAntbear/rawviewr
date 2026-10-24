import { byKey, byKind } from '@utils/strategy';
import { StoreSliceId } from '@WEBVIEW/features/store/definitions';

import type { StatusBarStateContext } from '../../state/types';

import type { DisplayedItemStrategies, ModeStrategies } from './types';

export function byViewMode<TResult>(strategies: ModeStrategies<TResult>, context: StatusBarStateContext): TResult {
  return byKey(strategies, context.appState[StoreSliceId.View].mode, context);
}

export function byDisplayedItem<TResult>(
  strategies: DisplayedItemStrategies<TResult>,
  context: StatusBarStateContext,
): TResult {
  return byKind(strategies, context.displayedItem, context);
}
