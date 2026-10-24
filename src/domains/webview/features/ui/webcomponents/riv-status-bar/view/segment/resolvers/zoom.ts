import { StoreSliceId } from '@WEBVIEW/features/store/definitions';
import { ZOOM } from '@WEBVIEW/features/store/slice/ViewSlice';

import type { StatusBarStateContext } from '../../../state/types';
import type { StatusBarEntry } from '../../types';

export function resolveZoom({ appState }: StatusBarStateContext): StatusBarEntry | null {
  const { zoom } = appState[StoreSliceId.View];

  return zoom === ZOOM.default
    ? null
    : { text: `${Math.round(zoom * 100)}%`, level: 'info' };
}
