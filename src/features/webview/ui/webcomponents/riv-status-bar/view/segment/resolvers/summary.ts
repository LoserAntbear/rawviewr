import type { BufferItemData } from '@features/buffer';
import { StoreSliceId } from '@features/webview/store/definitions';
import { StringFormat } from '@utils/string/formatters';

import type { StatusBarStateContext } from '../../../state/types';
import type { StatusBarEntry } from '../../types';
import { byMode, byDisplayedItem } from '../strategies';
import type { ModeStrategies, DisplayedItemStrategies } from '../types';

/** Some labels carry a description after an em dash; the bar only has room for the name. */
function formatName({ appState, formatRegistry }: StatusBarStateContext): string {
  return formatRegistry.get(appState[StoreSliceId.DecodeOptions].format).label.split(' — ')[0];
}

function isLoaded(item: BufferItemData): boolean {
  return item.data.byteLength > 0 && !item.error;
}

/**
 * The summary is always informational, so its strategies only decide the text. The payload
 * is built once, in `resolveSummary`, rather than restated in every branch.
 */
const SUMMARY_BY_DISPLAYED_ITEM: DisplayedItemStrategies<string | null> = {
  none: () => null,
  loading: ({ item }) => `${item.name} · loading…`,
  // The reason goes to the notes segment; the summary only says which buffer it was.
  failed: ({ item }) => item.name,
  resolved: ({ item, geometry }, context) => [
    `${geometry.width}×${geometry.height}`,
    formatName(context),
    `${geometry.bytesPerRow} B/row`,
    StringFormat.bytes(item.data.byteLength),
    ...(geometry.frameCount > 1 ? [`${geometry.frameCount} frames`] : []),
  ].join(' · '),
};

const SUMMARY_BY_MODE: ModeStrategies<string | null> = {
  single: (context) => byDisplayedItem(SUMMARY_BY_DISPLAYED_ITEM, context),
  gallery: (context) => {
    const items = [...context.appState[StoreSliceId.Sources].byId.values()];

    return items.length === 0
      ? null
      : `${items.filter(isLoaded).length} / ${items.length} buffers · ${formatName(context)}`;
  },
};

export function resolveSummary(context: StatusBarStateContext): StatusBarEntry | null {
  const text = byMode(SUMMARY_BY_MODE, context);

  return text === null
    ? null
    : { text, level: 'info', ...(context.displayedItem.kind === 'loading' ? { loading: true } : {}) };
}
