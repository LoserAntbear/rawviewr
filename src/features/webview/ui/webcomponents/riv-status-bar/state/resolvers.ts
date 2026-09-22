import { STORE_SELECTORS } from '@features/webview/store/selectors';
import type { AppStoreState } from '@features/webview/store/types';

import type { DisplayedItem } from './types';
import { ImageItem } from '@features/webview/store/slice/ImagesSlice';

type DisplayedItemRule = (item: ImageItem) => DisplayedItem | null;

const NO_DISPLAYED_ITEM: DisplayedItem = { kind: 'none' };

/**
 * PRIORITY MEANING ORDER MATTERS:
 * the first rule to claim the item wins.
 */
const PRIORITY_DISPLAYED_ITEM_RULES: readonly DisplayedItemRule[] = [
  (item) => (item.kind === 'failed' ? { kind: 'failed', message: item.message } : null),
  (item) => (item.kind === 'pending' ? { kind: 'loading', item } : null),
  (item) => (item.kind === 'empty' ? { kind: 'failed', message: 'Item is empty' } : null),
  (item) => (item.kind === 'ready' ? { kind: 'resolved', item } : null),
];

function winFirstClaim(
  item: ImageItem,
  rules: readonly DisplayedItemRule[] = PRIORITY_DISPLAYED_ITEM_RULES,
): DisplayedItem | null {
  return rules.reduce<DisplayedItem | null>(
    (claimed, rule) => claimed ?? rule(item),
    null,
  );
}

export function resolveDisplayedItem(state: AppStoreState): DisplayedItem {
  const item = STORE_SELECTORS.displayedItem(state);

  return (item ? winFirstClaim(item) : null) ?? NO_DISPLAYED_ITEM;
}
