import { AlphaMode, HeaderPreset } from '@SHARED/features/image/imageDecoder/definitions';
import { ZOOM } from '@WEBVIEW/features/store/slice/ViewSlice';

import { mapControlsToChoices, mapControlsToValues } from '../controls/utils';

import { ToolbarStateTransition } from './definitions';
import type { ToolbarAvailability, ToolbarState, ToolbarSyncPayload } from './types';

export function resolveAvailability({ options, zoom }: ToolbarSyncPayload): ToolbarAvailability {
  const { format, alphaMode, headerPreset } = options;
  const geometryLocked = headerPreset !== HeaderPreset.None;
  const dimension = { disabled: geometryLocked, placeholder: geometryLocked ? 'header' : 'auto' };

  return {
    width: dimension,
    height: dimension,
    offset: { placeholder: '0' },
    bytesPerRow: { placeholder: 'packed' },
    zoomIn: { disabled: zoom >= ZOOM.max },
    zoomOut: { disabled: zoom <= ZOOM.min },
    dimensions: { disabled: geometryLocked },
    alphaMode: { disabled: !format.hasAlpha },
    endian: { disabled: !format.endianSensitive },
    // Disabled on extremities reach since the zoom cannot go further.
    zoomReset: { disabled: zoom === ZOOM.default },
    bitOrderMsb: { hidden: !format.bitOrderSensitive },
    unpremultiply: { disabled: !format.hasAlpha || alphaMode === AlphaMode.Ignore },
  };
}

export function resolveToolbarState(sync: ToolbarSyncPayload): ToolbarState {
  return {
    values: mapControlsToValues(sync),
    choices: mapControlsToChoices(sync),
    kind: ToolbarStateTransition.Synced,
    availability: resolveAvailability(sync),
  };
}
