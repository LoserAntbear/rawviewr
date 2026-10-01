import { StoreSliceId } from '@features/webview/store/definitions';
import { ZOOM } from '@features/webview/store/slice/ViewSlice';

import type { StatusBarStateContext } from '../../../state/types';
import type { StatusBarEntry } from '../../types';

export function resolveZoom({ appState }: StatusBarStateContext): StatusBarEntry | null {
  const { zoom } = appState[StoreSliceId.View];

  return zoom === ZOOM.default
    ? null
    : { text: `${Math.round(zoom * 100)}%`, level: 'info' };
}
