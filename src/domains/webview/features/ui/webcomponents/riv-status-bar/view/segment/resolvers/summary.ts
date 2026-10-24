import type { Geometry } from '@SHARED/features/image/imageDecoder/imagePreparation/types';
import { StringFormat } from '@utils/string/formatters';
import { StoreSliceId } from '@WEBVIEW/features/store/definitions';
import { isReadyImageItem } from '@WEBVIEW/features/store/slice/ImagesSlice';

import type { StatusBarStateContext } from '../../../state/types';
import type { StatusBarEntry } from '../../types';
import { byDisplayedItem, byViewMode } from '../strategies';
import type { DisplayedItemStrategies, ModeStrategies } from '../types';

function formatName({ appState }: StatusBarStateContext): string {
  return appState[StoreSliceId.DecodeOptions].format.label.split(' — ')[0];
}

function formatDimensions({ appState }: StatusBarStateContext, geometry: Geometry): string {
  const guessed = !geometry.lockedByHeader && appState[StoreSliceId.DecodeOptions].width === 0;

  return `${geometry.width}×${geometry.height}${guessed ? ' (guessed)' : ''}`;
}

const SUMMARY_BY_DISPLAYED_ITEM: DisplayedItemStrategies<string | null> = {
  none: () => null,
  loading: () => 'loading…',
  failed: ({ message }) => `failed: ${message}`,
  resolved: ({ item }, context) => {
    if (!isReadyImageItem(item)) {
      return null;
    }

    const geometry = item.geometry;

    return [
      formatDimensions(context, geometry),
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
  const text = byViewMode(SUMMARY_BY_MODE, context);

  return text === null
    ? null
    : { text, level: 'info', ...(context.displayedItem.kind === 'loading' ? { loading: true } : {}) };
}
