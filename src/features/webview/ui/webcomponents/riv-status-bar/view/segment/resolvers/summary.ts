import { StoreSliceId } from '@features/webview/store/definitions';
import { StringFormat } from '@utils/string/formatters';

import type { StatusBarStateContext } from '../../../state/types';
import type { StatusBarEntry } from '../../types';
import { byMode, byDisplayedItem } from '../strategies';
import type { ModeStrategies, DisplayedItemStrategies } from '../types';
import { isReadyImageItem } from '@features/webview/store/slice/ImagesSlice';

function formatName({ appState, formatRegistry }: StatusBarStateContext): string {
  return formatRegistry.get(appState[StoreSliceId.Images].decodeOptions.format).label.split(' — ')[0];
}

const SUMMARY_BY_DISPLAYED_ITEM: DisplayedItemStrategies<string | null> = {
  none: () => null,
  loading: () => `loading…`,
  failed: ({ message }) => `failed: ${message}`,
  resolved: ({ item }, context) => {
    if (!isReadyImageItem(item)) {
      return null;
    }

    const geometry = item.geometry;

    return [
      `${geometry.width}×${geometry.height}`,
      formatName(context),
      `${geometry.bytesPerRow} B/row`,
      StringFormat.bytes(item.byteLength),
      ...(geometry.frameCount > 1 ? [`${geometry.frameCount} frames`] : []),
    ].join(' · ');
  },
};

const SUMMARY_BY_MODE: ModeStrategies<string | null> = {
  single: (context) => byDisplayedItem(SUMMARY_BY_DISPLAYED_ITEM, context),
  gallery: (context) => {
    const sources = [...context.appState[StoreSliceId.Sources].byId.values()];
    const imageItems = [...context.appState[StoreSliceId.Images].byId.values()];

    return imageItems.length === 0
      ? null
      : `${imageItems.filter(isReadyImageItem).length} / ${sources.length} sources · ${formatName(context)}`;
  },
};

export function resolveSummary(context: StatusBarStateContext): StatusBarEntry | null {
  const text = byMode(SUMMARY_BY_MODE, context);

  return text === null
    ? null
    : { text, level: 'info', ...(context.displayedItem.kind === 'loading' ? { loading: true } : {}) };
}
