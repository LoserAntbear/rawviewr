import { mapControlsToValues } from '../controls/utils';
import { AlphaMode, HeaderPreset } from '@features/image/imageDecoder/definitions';
import { ZOOM } from '@features/webview/store/slice/ViewSlice';

import { ToolbarStateTransition } from './definitions';
import type { ToolbarState, ToolbarAvailability, ToolbarSyncPayload } from './types';

export function resolveAvailability({ options, zoom }: ToolbarSyncPayload): ToolbarAvailability {
  const { format, alphaMode, headerPreset } = options;
  const geometryLocked = headerPreset !== HeaderPreset.None;
  const dimension = { disabled: geometryLocked, placeholder: geometryLocked ? 'header' : 'auto' };

  return {
    width: dimension,
    height: dimension,
    offset: { placeholder: '0' },
    bytesPerRow: { placeholder: 'packed' },
    alphaMode: { disabled: !format.hasAlpha },
    endian: { disabled: !format.endianSensitive },
    bitOrderMsb: { hidden: !format.bitOrderSensitive },
    unpremultiply: { disabled: !format.hasAlpha || alphaMode === AlphaMode.Ignore },
    // Disabled on extremities reach since the zoom cannot go further.
    zoomIn: { disabled: zoom >= ZOOM.max },
    zoomOut: { disabled: zoom <= ZOOM.min },
    zoomReset: { disabled: zoom === ZOOM.default },
  };
}

export function resolveToolbarState(sync: ToolbarSyncPayload): ToolbarState {
  return {
    values: mapControlsToValues(sync.options),
    kind: ToolbarStateTransition.Synced,
    availability: resolveAvailability(sync),
  };
}
