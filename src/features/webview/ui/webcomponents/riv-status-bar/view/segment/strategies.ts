import { StoreSliceId } from '@features/webview/store/definitions';
import { byKey, byKind } from '@utils/strategy';

import type { StatusBarStateContext } from '../../state/types';
import type { ModeStrategies, DisplayedItemStrategies } from './types';

export function byViewMode<TResult>(strategies: ModeStrategies<TResult>, context: StatusBarStateContext): TResult {
  return byKey(strategies, context.appState[StoreSliceId.View].mode, context);
}

export function byDisplayedItem<TResult>(
  strategies: DisplayedItemStrategies<TResult>,
  context: StatusBarStateContext,
): TResult {
  return byKind(strategies, context.displayedItem, context);
}
